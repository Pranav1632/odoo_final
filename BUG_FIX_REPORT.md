# PeoplePay360 — Bug Audit & Fix Report

**Scope:** Full re-audit of the current codebase (post-pull), live end-to-end testing against an isolated test database, and code fixes. No code was committed or pushed. Database changes were made only against a disposable, isolated test Postgres instance created for this session — the shared/local Postgres service and any other database on this machine were never touched.

**Verification method:**
- Backend: `npx tsc --noEmit` (clean) + full Jest suite (**82/82 passing**, before and after every round of fixes)
- Frontend: `npm run build` (clean, no errors)
- Live E2E: both servers started on isolated ports (backend :4100, frontend :5180) against a freshly seeded test database, driven through a real browser (login → employees → contracts → schedules → payrun wizard → compute → validate → mark paid → PDF → send-payslips → audit log) plus targeted `curl` checks for security/permission behavior

---

## 1. Critical security fixes

| # | Issue | Fix | Verified |
|---|---|---|---|
| 1 | `POST /api/auth/register` accepted a client-supplied `role` field with no gate — anyone could self-register as `ADMIN`. | Removed `role` from the register payload entirely; every self-registered account is now forced to `EMPLOYEE`. | `curl` register with `role:"ADMIN"` → account created as `EMPLOYEE`. |
| 2 | CORS middleware in `app.ts` had a dead-code fallback: both the "allowed" and "not allowed" branches called `callback(null, true)`, so **every** origin was accepted with `credentials: true`. | Disallowed origins now get a CORS error (no `Access-Control-Allow-Origin` header). | `curl -H "Origin: http://evil.example"` → no CORS header leaked; legitimate origin still gets the header. |
| 3 | `GET /api/schedules` and `GET /api/schedules/:id` only required `requireAuth` (any logged-in user), unlike sibling POST/PATCH/DELETE — any `EMPLOYEE` could enumerate every other employee's name via schedule assignment lists. | Both routes now require `HR_MANAGER`/`HR_PAYROLL_USER`/`HR_PAYROLL_MANAGER`/`ADMIN`. | `curl` as an `EMPLOYEE` token → `403`. |
| 4 | `Authorization: bearer <token>` (lowercase) was rejected — `.replace('Bearer ', '')` only matched the exact-case literal. | Regex-based, case-insensitive strip. | `curl -H "Authorization: bearer <token>"` → `200`. |

## 2. Access-control / RBAC gaps vs. the spec

The PS explicitly defines **HR Payroll User = "All HR Manager permissions" + payroll CRUD + read-only salary config**. The actual `requireRole([...])` arrays on `employees.ts`, `attendance.ts`, `timeoff.ts`, and `schedules.ts` (write routes) were missing `HR_PAYROLL_USER` — that role could not manage employees, attendance corrections, schedules, or time-off types/allocations/approvals at all, contradicting the "inherits HR Manager" rule.

**Fixed:** added `HR_PAYROLL_USER` to all the affected `requireRole` arrays (3 in `employees.ts`, 2 in `attendance.ts`, 7 in `timeoff.ts`, 3 in `schedules.ts`). Verified against the existing Jest security suite (still 82/82 — no test asserted the old, narrower behavior) and via `curl` with a `payroll.user@peoplepay360.com` token (schedules list now `200`, previously `403`).

## 3. Data-leak / correctness bugs (backend)

| # | File | Bug | Fix |
|---|---|---|---|
| 5 | `routes/attendance.ts`, `routes/timeoff.ts` (allocations + requests) | A session with `role: EMPLOYEE` but no linked `employeeId` (e.g. after an admin deletes the linked Employee record) filtered by `employeeId: session.employeeId!` — Prisma treats `undefined` in a `where` clause as "no filter," so the user got **every employee's** records instead of none. | Added `if (!session.employeeId) return res.json([])` guard, matching the pattern already correctly used in `payslips.ts`. |
| 6 | `routes/payruns.ts` `/compute` | Recompute was blocked only for `status: 'paid'`, not `'validated'` — an `HR_PAYROLL_USER` could silently revert a manager-validated payrun back to `computed` with recalculated net salaries, bypassing the two-person validation control. | Now blocks recompute on both `validated` and `paid`. |
| 7 | `routes/contracts.ts` `PATCH /:id` | The "no two active contracts per employee" rule was enforced on `POST` but not `PATCH` — an expired/draft contract could be flipped back to `active` while another `active` contract already existed for the same employee. | Same 409 duplicate-check now runs on `PATCH` when the update sets `status: 'active'`. |
| 8 | `routes/schedules.ts` `PATCH /:id` | Replacing schedule lines did `deleteMany` then a separate `update` — not atomic. A failure between the two left a schedule with zero lines, silently corrupting weekly-hours for every employee on it. | Wrapped in `prisma.$transaction`. |
| 9 | `lib/attendance.ts` `getWorkedDaysForPeriod` | `records.filter(...).length \|\| records.length` — if an employee genuinely had 0 qualifying days, `0 \|\| records.length` fell back to the **total unfiltered record count**, inflating salary pro-ration. | Removed the fallback; returns the real count (including 0). |
| 10 | `lib/payroll/generatePdf.ts` | Hardcoded `['Basic','Allowance','Gross','Deduction','Net']` category whitelist silently dropped any salary-rule line with a different category from the printed PDF, even though it still contributed to `netSalary`. | Categories are now derived from the payslip's actual lines (preferred order preserved, unknown categories appended, none dropped). |
| 11 | `lib/payroll/workers/sendPayslips.ts` | Query picked up `status: { in: ['validated','paid'] }` — a second run of the same job re-processed already-paid payslips (re-logged as "sent", duplicate audit entries). | Now only picks up `status: 'validated'`; also switched the per-row `update` loop to a single `updateMany` after the loop (efficiency). |
| 12 | `lib/payroll/queue.ts` + `routes/payruns.ts` `/send-payslips` | Without Redis, the BullMQ connection retried forever with no bound — the endpoint **hung indefinitely** instead of the documented "return 503, not 500." Once a bounded `retryStrategy`/`connectTimeout` was added, the resulting Node `AggregateError` has an **empty `.message`**, so the existing `message.includes('ECONNREFUSED')` check never matched and the route fell through to a generic `500`. | Added a bounded `retryStrategy` (gives up after 3 tries) + `connectTimeout`; rewrote the error-shape detection to also check `.code` and the nested `.errors[]` array, not just `.message`. Confirmed: request now fails in ~150ms with a proper `503`, not a hang or a `500`. |
| 13 | `routes/payruns.ts` `GET /` | Frontend expected a `totalNet` field that the backend never returned (undefined → always rendered `₹0`). | Now aggregates `sum(payslip.netSalary)` per payrun in the list response. |
| 14 | `routes/payruns.ts` (new) | Wizard Step 2 needed period-aware eligibility *before* a Payrun exists, but the only eligibility endpoint required an existing `:id`. The frontend fell back to a local heuristic (`contracts.some(status==='active')`) that ignored the payrun's period entirely. | Added `GET /api/payruns/eligible-employees?periodStart=&periodEnd=`, reusing the same `getActiveContractForPeriod` logic, registered before `/:id` to avoid Express treating "eligible-employees" as an `:id`. |
| 15 | `routes/dashboard.ts` | Empty `monthlyTrend`/`attendanceOverview`/`timeOffByType` were replaced with **hardcoded fake numbers** (e.g. `{month:'Jul', totalNet:142000}`) — directly contradicts the PS requirement that the dashboard reflect only live data. | Removed the fallback; genuinely empty periods now return empty arrays and the frontend renders its existing "No data recorded" empty state. |

## 4. Frontend bugs

| # | File | Bug | Fix |
|---|---|---|---|
| 16 | `EmployeeForm.jsx` | Read an undefined `employee` variable (`employee?.fullName`, `employee?.employeeId`, `employee?.contractsCount`, etc.) — component only held `formData` state. **This crashed the Edit Employee page outright** (`ReferenceError`). | Added `employee` state (the fetched raw record); fixed all field-name mismatches (`_count.contracts` / `.attendances` / `.timeOffRequests` / `.allocations`, `employee.id` not `.employeeId`). Also fixed "Start Date"/"Active Since" to derive from the earliest linked contract (Employee has no `createdAt`/hire-date field at all). |
| 17 | `EmployeesList.jsx` | Referenced an undefined `jobPositions` variable in the Kanban view — **crashed on toggling Kanban view**. Also `emp.name.toLowerCase()` with no guard, and a fetch error was captured into state but never rendered (silent failures looked like "no employees"). | Removed the broken lookup (renders the raw job-position string, matching the List view); guarded `emp.name`; added a visible error banner. |
| 18 | `EmployeeView.jsx` | Attendance/Time Off/Allocations smart-button counts were always `0` — the API only returns the full `contracts` array plus `_count` aggregates for the rest, but the page computed counts from the (always-empty) full arrays. Also `employee.fullName` (no such field) used in the breadcrumb and the deactivate-confirmation text. | Counts now read from `employee._count.*`; `fullName` references fall back to `employee.name`. |
| 19 | `Dashboard.jsx` + `UI.jsx` `KPICard` | `KPICard` did `Math.abs(trend)` assuming a number, but `Dashboard.jsx` passed strings (`'+12.4%'`, `'Per Employee'`) — every KPI tile rendered **"→ NaN%"**. The `+12.4%` figure was also fabricated (no real trend data exists). | `KPICard` now renders a string trend as-is (no math); the fabricated `+12.4%` was replaced with an honest "Total Paid" label. |
| 20 | `Dashboard.jsx` | No request sequencing — a fast filter change could let an older, slower response overwrite a newer one. Fetch errors were only `console.error`'d with no visible failure state. | Added a request-id guard (stale responses are ignored) and a visible error banner. |
| 21 | `Profile.jsx` | `getSession()` returns a new object reference every render; used directly as a `useEffect` dependency → the effect's own state updates re-triggered the effect, causing an **unbounded refetch loop**. | Effect now depends on the stable `session?.employeeId` string, not the object. |
| 22 | `Topbar.jsx` | The same `ref` was attached to both the search wrapper `<div>` and the inner `<input>` — once the input mounted, the outside-click handler only recognized clicks on the bare input as "inside," so clicking anywhere else in the search dropdown (including its own footer) closed it immediately. | Split into two refs (`searchRef` for the wrapper, `searchInputRef` for the input). |
| 23 | `ToastContainer.jsx` | `useState(() => toastState.subscribe(setToasts))` ran the subscribe call but discarded the returned unsubscribe function — every mount permanently leaked a listener, growing forever across login/logout cycles. | Changed to `useEffect(() => toastState.subscribe(setToasts), [])`, which correctly runs the cleanup on unmount. |
| 24 | `SalaryRuleForm.jsx` | `parseInt(sequence,10) \|\| 1` and `rule.sequence ? ... : '1'` — a legitimate `sequence: 0` silently became `1` on both load and save. | Replaced both with explicit null/NaN checks (0 is preserved; the backend's own `.positive()` validation now correctly rejects it with a visible error, instead of the frontend silently rewriting it). |
| 25 | `TimeOffList.jsx` | No validation that end date ≥ start date; duration calc used `Math.abs()`, which masked a reversed range as a plausible positive number of days. | Added an explicit validation error; duration calc now returns `0` for a reversed range instead of masking it. |
| 26 | `AuditLog.jsx` | Unguarded `JSON.parse(l.details)` inside a `.then()` — one malformed `details` string threw, silently failing the *entire* audit-log fetch (both audit and error logs), rendering "No audit log entries found" with no indication anything failed. | Wrapped in try/catch, defaulting to `{}` on parse failure. |
| 27 | `PayrunsList.jsx` | Rendered a "Created By" column the backend has no field for (blank on every row — there is no user-tracking field on `Payrun` in the schema). | Removed the column rather than fabricate data; `totalNet` now works correctly since the backend fix (#13). |
| 28 | `PayrunWizard.jsx` | "Eligible" badge was computed from a local heuristic (`contracts.some(status==='active')`, defaulting to eligible when contracts were simply absent) that ignored the payrun's period — could show "Eligible" for someone whose contract doesn't actually cover the selected period, then have them silently dropped by the backend on attach, with the `{added,skipped,alreadyAttached}` response discarded via `.catch(console.warn)`. | Step 2 now calls the new period-aware `eligible-employees` endpoint (#14) and pre-selects only genuinely eligible employees; if the backend still skips anyone at attach time (stale selection), the skipped count is now surfaced as a visible warning banner on the resulting Payrun page (`PayrunDetail.jsx`) instead of silently swallowed. |

---

## 5. Live end-to-end verification performed

Seeded a fresh isolated test database (55 users, 100 contracts, 1397 attendance records, 100 leave allocations, 2 historical payruns) and walked through, in a real browser against the running app:

- Login (admin, role selector, credential validation) — CORS preflight/allowed-origin confirmed correct
- Dashboard: real aggregated totals, department costs, monthly trend, period/department filters (`?department=Marketing` → different real totals; `?period=2026-07` → different real totals) — no more NaN%, no more fake fallback numbers
- Employees: List, Kanban (no crash), New, **Edit (no crash, was previously broken)**, View (counts now correct)
- Contracts: duplicate-active-contract guard on PATCH (409 confirmed)
- Schedules: role gate confirmed (`EMPLOYEE` → 403; `ADMIN`/`HR_PAYROLL_USER` → 200), weekly-hours auto-computed
- Full Payrun lifecycle: Wizard (period-aware eligibility, 50/50 correctly marked eligible, Admin correctly excluded) → Create → **Compute** (real worked-days, real net salaries) → **Validate** (blocking-warning check) → recompute-after-validate correctly blocked (400) → **Mark Paid** → **PDF download** (valid single-page PDF) → **Send Payslips** without Redis available (503 in ~150ms, not a hang or crash)
- Audit Log: human-readable names/emails render correctly

## 6. Known limitations / not fixed (with reasons)

- **Bulk payslip email is a console-log stub** (`// LOCAL DEMO ONLY`), not real delivery — this is by original design for the dev environment, not something this pass changed. The PS asks for "facilitating bulk email distribution," which is only partially met; flagged again in the PS report below.
- **Redis/BullMQ was not available in this environment** (no Docker daemon came up in time, no local Redis binary). The `send-payslips` queue path is verified to fail gracefully (503) but the actual worker/email-log path was never exercised against a live queue.
- **Minor React console warnings** ("Each child in a list should have a unique key prop" on some `<Select>` usages, one "uncontrolled → controlled input" warning) are cosmetic dev-mode-only warnings with no observed functional impact — left as-is given the scope of this pass.
- **`PATCH /api/employees/:id-that-does-not-exist` returns 500, not 404** — Prisma throws on updating a nonexistent record and there's no existence check first. This pattern likely repeats across several PATCH/DELETE routes; out of scope for this pass but worth a follow-up sweep.
- Employee "Start Date"/tenure is derived from the earliest linked Contract, because the `Employee` model has no `createdAt`/hire-date field of its own — a real fix would need a schema migration (see recommendation in the PS report).

## 7. Environment notes

- A disposable Postgres instance was initialized in the scratchpad directory (port 5544, trust auth) purely for this session's testing — it does not touch the shared local Postgres service (port 5432) or the remote database other tools on this machine are connected to.
- The dev servers used for testing ran on non-default ports (backend `:4100`, frontend `:5180`) specifically to avoid colliding with another session's dev server already running on `:5173`.
- `server/.env` was created fresh (none existed) pointing at the isolated test database; it is git-ignored and was not committed.
- Nothing was committed or pushed, per your instructions.
