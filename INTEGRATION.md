# INTEGRATION.md — Merge Rules, Interface Contracts & Demo Path
> Read this before merging any branch. This document defines exactly how the three builds come together.

> ⚠️ **ARCHITECTURE CHANGE (v3):** The repo is now split into `web/` (Next.js, Person C, frontend only) and `server/` (Express, Person A + Person B, all API routes) as two separate processes. Every reference below to an `/app/api/...` route now means a `server/src/routes/...` Express route reachable at the same path, mounted in `server/src/index.ts`. See `MASTER_BUILD_SPEC.md` Section 0 for the full architecture, and each `BUILD_PERSON_*.md`'s "Express Migration Addendum" for per-person route conversion detail. Interface contracts (response shapes), business logic, and the demo script are unchanged — only the process boundary and file paths change, reflected throughout this document below.

---

## Integration Order

Build and merge in this exact sequence. Do not merge out of order — later items depend on earlier ones.

| Step | Who | What | Why it must come first |
|------|-----|------|----------------------|
| 0 | Person A | `server/` scaffold: `package.json`, Express + deps installed, `src/index.ts` + `src/app.ts` shell (empty route mounts), `middleware/auth.ts`, `middleware/errorHandler.ts`, `lib/asyncHandler.ts`, `lib/apiError.ts` | Nobody's route file compiles without the Express app shell and shared middleware existing first — this is new in v3 and comes before even the DB schema |
| 1 | Person A | Prisma schema + migrations + seed (in `server/prisma/`) | All code depends on the DB schema |
| 2 | Person A | `server/src/lib/prisma.ts`, `contracts.ts`, `attendance.ts`, `audit.ts`, `errorLog.ts` | Person B imports these; Person C's frontend doesn't import backend libs at all anymore (auth helpers live client-side in `web/lib/auth-client.ts` instead) |
| 3 | Person B | `server/src/lib/payroll/computeRules.ts` | Must be tested standalone before any API wiring |
| 4 | Person A | Auth route + Employee/Contract/Schedule Express routes, mounted in `server/src/index.ts` | Person C needs these for Login and Employee screens |
| 5 | Person B | Salary Structure/Rule routes + Payrun create (Express) | Person C needs these for Wizard |
| 6 | Person C | `web/` scaffold: Next.js app, `lib/api.ts` with `NEXT_PUBLIC_API_BASE_URL`, Login + Nav + Employee screens | Can now be wired to real APIs across the network boundary — first point where CORS actually gets exercised, confirm it works here, not later |
| 7 | Person A | Attendance + Time Off routes (Express) | Person C wires Time Off screens |
| 8 | Person B | Payrun compute/validate/mark-paid + Payslip routes (Express) | Person C wires Payrun Processing screen |
| 9 | Person B | PDF + Excel routes (Express, binary response handling) | Person C wires download buttons |
| 10 | Person C (route co-owned into `server/`) | Dashboard UI in `web/` + `GET /api/dashboard` written by Person C but committed into `server/src/routes/dashboard.ts` | Depends on all data existing; first case of Person C's code physically landing in Person A/B's process — coordinate the commit, don't let it silently conflict |
| 11 | Person B | BullMQ worker + send-payslips route (Express) | Last — queue needs everything else working first |

---

## Interface Contracts

These are the exact handoff points between teammates. Do not deviate from these shapes.

### Contract 1: `getActiveContractForPeriod` (Person A → Person B)

**File:** `/lib/contracts.ts`  
**Exported by:** Person A  
**Imported by:** Person B in `/app/api/payruns/[id]/compute/route.ts` and `/app/api/payruns/[id]/eligible-employees/route.ts`

```typescript
// Function signature — must match exactly
export async function getActiveContractForPeriod(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<(Contract & { salaryStructure: SalaryStructure & { rules: SalaryRule[] } }) | null>
```

Person B must import this. Person B must NOT write their own contract resolution logic.

---

### Contract 2: `getWorkedDaysForPeriod` (Person A → Person B)

**File:** `/lib/attendance.ts`  
**Exported by:** Person A  
**Imported by:** Person B in the compute route

```typescript
// Function signature — must match exactly
export async function getWorkedDaysForPeriod(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number>  // returns a number; returns 30 as documented fallback if no attendance data
```

If Person A's attendance helper is not ready by Hour 10 sync, Person B may use the fallback of 30 directly and must mark it clearly:
```typescript
// TODO: wire getWorkedDaysForPeriod when Person A delivers it
const workedDays = 30; // TEMPORARY FALLBACK — replace at Hour 10 sync
```

---

### Contract 3: `GET /api/payruns/:id` response shape (Person B → Person C)

Person C's Payrun Processing screen (`/app/(dashboard)/payroll/[id]/page.tsx`) reads exactly this shape from Person B's API:

```typescript
{
  id: string;
  name: string;
  periodStart: string;  // ISO 8601 date string
  periodEnd: string;    // ISO 8601 date string
  status: 'draft' | 'computed' | 'validated' | 'paid';
  salaryStructure: { id: string; name: string };
  payslips: Array<{
    id: string;
    employee: { id: string; name: string; department: string };
    status: 'draft' | 'computed' | 'validated' | 'paid';
    netSalary: number | null;
    warnings: string[];
  }>;
}
```

Person B: do not change this shape after Hour 6 sync without updating Person C.  
Person C: do not access any field not listed above.

---

### Contract 4: `GET /api/payslips/:id` response shape (Person B → Person C)

Person C's Payslip Detail screen reads exactly this shape:

```typescript
{
  id: string;
  employee: { id: string; name: string; department: string };
  payrun: { id: string; name: string; periodStart: string; periodEnd: string };
  status: string;
  workedDays: number;
  netSalary: number | null;
  warnings: string[];
  lines: Array<{
    code: string;
    name: string;
    category: 'Basic' | 'Allowance' | 'Gross' | 'Deduction' | 'Net';
    amount: number;
  }>;
}
```

---

### Contract 5: `GET /api/dashboard` response shape (Person C → Person C)

Person C still defines both the shape and the consuming page, per BUILD_PERSON_C.md Task 14 — unchanged. **New in v3:** the route itself physically lives in `server/src/routes/dashboard.ts` (Person A/B's process), not in `web/`, since there are no Next.js API routes anymore. Person C hands off the Task 14 code (converted to the Express pattern in BUILD_PERSON_C.md's addendum) for Person A to mount, or commits directly into `server/` if the team's repo access allows it. The shape itself must not change once wired, regardless of which process the file lives in.

---

### Contract 6: Auth token format (Person A → Person C)

Person A's login route issues a JWT with this payload:
```typescript
{ userId: string; email: string; role: string; employeeId?: string }
```

Person C reads this via `getSession()` in `/lib/auth-client.ts`. Person C must NOT add fields to the JWT without telling Person A to update the login route.

---

### Contract 7: `writeAuditLog` and `writeErrorLog` (Person A → Person B + C)

Both Person B and Person C call these helpers. The function signatures must remain stable after Hour 2:

```typescript
// audit.ts
writeAuditLog({ userId, action, entityType, entityId, details? }): Promise<void>

// errorLog.ts
writeErrorLog({ route, userId?, message, stack? }): Promise<void>
```

---

### Contract 8: Frontend↔Backend base URL + CORS (Person A → Person C) — new in v3

Person A's Express app (`server/src/index.ts`) accepts requests only from the origin in `WEB_ORIGIN` (`server/.env`). Person C's `web/lib/api.ts` sends every request to `NEXT_PUBLIC_API_BASE_URL` (`web/.env.local`). These two values must point at each other:

```
server/.env:        WEB_ORIGIN="http://localhost:3000"
web/.env.local:      NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
```

If either machine runs the other process over LAN instead of localhost (per the LAN setup below), both values change to that machine's LAN IP — **update both together**, a mismatch here is the single most likely new integration bug in v3 and manifests as CORS errors in the browser console that look like a bug in the route itself. Check this first if API calls fail with no clear error.

---

## Sync Checkpoints (mandatory — do not skip)

### Hour 6 Sync
**All three people stop, pull, and verify together:**
- [ ] `git pull`, `cd server && npx prisma migrate dev` runs clean for everyone
- [ ] Seed script runs with no errors: 50 employees, 2+ contracts each, 2 historical payruns
- [ ] `server/src/lib/{prisma,contracts,attendance,audit,errorLog}.ts` are committed and importable
- [ ] `server/src/app.ts` exists, exports `createApp()`, and boots cleanly with all currently-built routes mounted
- [ ] `server/src/middleware/{auth,errorHandler}.ts` are committed; a smoke-tested route confirms `requireAuth`/`requireRole` reject correctly
- [ ] `computeSalaryRules` unit tests pass
- [ ] `cd server && npm run dev` starts on :4000; `cd web && npm run dev` starts on :3000, both with no TypeScript errors on `tsc --noEmit` in each folder
- [ ] **New in v3:** a manual `curl http://localhost:4000/api/employees` (with a valid token) succeeds from a terminal on the machine running `web/`, confirming CORS/network reachability before any UI code depends on it

### Hour 10 Sync
**All three people stop and verify integration is working end-to-end:**
- [ ] `getActiveContractForPeriod` is live and Person B has it wired into compute
- [ ] `getWorkedDaysForPeriod` is live or explicitly using the fallback (remove fallback comment if real data works)
- [ ] Person C's Payrun Wizard Step 2 shows real eligible employees from Person B's API (not mock data) — fetched cross-origin via `NEXT_PUBLIC_API_BASE_URL`, not a relative path
- [ ] Login works; session persists; nav shows role-appropriate links
- [ ] **New in v3:** browser DevTools Network tab shows no CORS errors on any request; `WEB_ORIGIN` and `NEXT_PUBLIC_API_BASE_URL` confirmed pointing at each other correctly (Contract 8)
- [ ] Full run through: create an employee, create a contract, create a payrun, add the employee, compute → get a payslip with real line items

### Hour 14 Sync
**Full 8-Step Quick Test Flow run-through as a team (live, not mocked):**
1. Admin creates a Salary Structure with Salary Rules, a Working Schedule, and a Time Off Type
2. Create an Employee with two Contracts (one expired, one active)
3. Create a Payrun: Wizard Step 1 → Step 2 → confirm employee selection
4. Compute the Payrun → verify payslip uses period-correct contract and runs rules in sequence
5. Approve a Time Off Request → verify allocation balance drops
6. Validate the Payrun → Mark Paid → download Payslip PDF
7. Confirm Payroll Dashboard reflects new data
8. **Live rule edit test:** Edit a SalaryRule amount → recompute a still-draft payslip → verify netSalary changes

**Security Audit Checklist at Hour 14:**
- [ ] EMPLOYEE-role user calling `GET /api/employees` returns only their own record (not all 50)
- [ ] EMPLOYEE-role user calling `GET /api/salary-rules` returns 403
- [ ] HR_MANAGER-role user calling `POST /api/payruns` returns 403
- [ ] `server/.env` and `web/.env.local` are not present in `git status` (two files now, not one)
- [ ] Malformed SalaryRule POST (missing formula when method = formula) returns 400, not 500
- [ ] All seeded user passwords are bcrypt hashes (check via `prisma studio`)
- [ ] **New in v3:** `server/src/index.ts` has `helmet()` mounted and CORS locked to `WEB_ORIGIN` — confirm a request with `Origin: http://evil.example.com` does not receive a matching `Access-Control-Allow-Origin` header (see Person A's `security.test.ts` CORS block)
- [ ] **New in v3:** a response from any route does not include an `X-Powered-By: Express` header (helmet strips it)
- [ ] **New in v3:** `server/src/middleware/errorHandler.ts` is registered after every route in `index.ts`/`app.ts` — confirm by triggering a deliberate error and checking it returns the expected JSON 500, not a hang or an unhandled rejection in the server logs
- [ ] **New in v3:** `npm test` passes in both `server/` (Person A + B's supertest suites) and `web/` (Person C's RTL suites) — they're now two separate test runs, not one

### Hour 17 Hard Freeze
- [ ] Security audit re-run (same checklist as Hour 14)
- [ ] All 8 demo steps work without any error
- [ ] No `console.error` outputs during the demo path (except intentional test errors)
- [ ] PDF download works for at least one payslip
- [ ] Excel download works for at least one payrun
- [ ] After freeze: only bug fixes that would block the demo script are permitted

---

## Merge Rules

**Branch naming:**
```
person-a/[feature-name]    e.g. person-a/employee-crud
person-b/[feature-name]    e.g. person-b/payrun-compute
person-c/[feature-name]    e.g. person-c/dashboard
```

**Who merges what:**
- Person A: merges all `person-a/*` branches, owns `main` at Hour 0-6
- After Hour 6: merge to main only after the team has confirmed the sync checkpoint
- Conflict resolution: the person who owns the file has final say

**What to verify before merging:**
- `tsc --noEmit` passes with no errors **in the folder you touched** (`server/` or `web/` — they have separate `tsconfig.json`/`package.json`, so check both if your change spans the boundary, e.g. the dashboard route handoff)
- Your tests pass: `cd server && npm test -- --testPathPattern=person-[a/b]` for Person A/B, `cd web && npm test -- --testPathPattern=person-c` for Person C — **two separate test commands now, not one**
- The API routes you added return the correct shape — smoke-test with `curl http://localhost:4000/api/...` (not a browser hitting `web/`, since routes no longer live there)

---

## What Each Agent Must NOT Touch

| File / Module | Owner | Others must NOT modify |
|---------------|-------|----------------------|
| `server/prisma/schema.prisma` | Person A | B and C must not alter — ask A to add models |
| `server/prisma/migrations/*` | Person A | Never touch other people's migrations |
| `server/src/index.ts`, `server/src/app.ts` | Person A | B and C must not modify the app shell/mount order — ask A to add a new route mount |
| `server/src/middleware/auth.ts` | Person A | B and C import (`requireAuth`, `requireRole`) — never modify |
| `server/src/middleware/errorHandler.ts` | Person A | B and C must not modify |
| `server/src/lib/apiError.ts` | Person A | B imports `ApiError` — never modify |
| `server/src/lib/asyncHandler.ts` | Person A | B imports — never modify |
| `server/src/lib/contracts.ts` | Person A | B imports — never modify |
| `server/src/lib/attendance.ts` | Person A | B imports — never modify |
| `server/src/lib/audit.ts` | Person A | B imports — never modify |
| `server/src/lib/errorLog.ts` | Person A | B imports — never modify |
| `server/src/lib/payroll/computeRules.ts` | Person B | A and C must not touch |
| `server/src/lib/payroll/generatePdf.ts` | Person B | C calls the API route — never modifies this lib |
| `server/src/routes/dashboard.ts` | Person C (content), mounted by Person A | Person A must not change the response shape without telling C; C must not touch other route files in `server/src/routes/` |
| `web/components/ui/*` | Person C | A and B must not add components here (they shouldn't be touching `web/` at all) |
| `web/lib/api.ts` | Person C | A and B must not modify — A is notified if the `NEXT_PUBLIC_API_BASE_URL` contract changes |
| `web/lib/auth-client.ts` | Person C | A must not modify — A only owns the JWT payload shape it reads (Contract 6) |

---

## Demo Path (8-Step Quick Test Flow — every click mapped)

This is the literal 5-minute demo script. Every step must work.

| Step | What happens | Person A code | Person B code | Person C code |
|------|-------------|---------------|---------------|---------------|
| 1 | Admin creates Salary Structure "Regular Salary" with 7 rules | — | `POST /api/salary-structures`, `POST /api/salary-rules` (x7) | Salary Structure form, Salary Rule form |
| 1 | Admin creates Working Schedule | `POST /api/schedules` | — | Schedule form |
| 1 | Admin creates Time Off Type "Annual Leave" | `POST /api/timeoff/types` | — | Time Off Types form |
| 2 | Create Employee "Demo Employee" | `POST /api/employees` | — | Employee form |
| 2 | Create expired Contract (endDate 6 months ago) | `POST /api/contracts` | — | Contract form |
| 2 | Create active Contract (current) | `POST /api/contracts` | — | Contract form |
| 3 | Click New Payrun → Wizard Step 1 (name, period, structure) | — | `POST /api/payruns` | Wizard Step 1 |
| 3 | Wizard Step 2: select "Demo Employee" | — | `GET /api/payruns/[id]/eligible-employees`, `POST /api/payruns/[id]/employees` | Wizard Step 2 checkboxes |
| 4 | Click Compute | — | `POST /api/payruns/[id]/compute` | Compute button + polling |
| 4 | Verify payslip uses active (not expired) contract | — | `computeRules.ts` + `getActiveContractForPeriod` | Payslip detail screen |
| 5 | Approve a Time Off Request for Demo Employee | `PATCH /api/timeoff/requests/[id]/approve` | — | Time Off Requests list, Approve button |
| 5 | Verify allocation balance drops | `GET /api/timeoff/allocations` | — | Allocations list (remaining column) |
| 6 | Click Validate | — | `POST /api/payruns/[id]/validate` | Validate button |
| 6 | Click Mark Paid | — | `POST /api/payruns/[id]/mark-paid` | Mark Paid button |
| 6 | Click Download PDF | — | `GET /api/payslips/[id]/pdf` | Download PDF button |
| 7 | Navigate to Dashboard | — | — | `GET /api/dashboard` → Dashboard page |
| 7 | Verify Total Net Paid, payslip count reflect new data | — | — | KPI cards |
| 8 | **LIVE RULE EDIT:** Navigate to the Salary Rule for "BASIC" | — | `PATCH /api/salary-rules/[id]` | Salary Rule form |
| 8 | Change BASIC from 30000 to 35000, save | — | Rule saved to DB | Salary Rule form save |
| 8 | Navigate to the payrun, click Compute again | — | `POST /api/payruns/[id]/compute` (payrun must still be non-paid) | Compute button |
| 8 | Show payslip detail — NET salary is now higher | — | Delete+recreate PayslipLines with new value | Payslip detail screen |

**Note for Step 8:** To make this demo-able, keep one payrun in 'computed' (not paid) status specifically for the live edit demonstration. The two seeded historical payruns are 'paid' and 'validated' — create a third during the demo.

---

## Known Integration Risks + Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Person B starts building before Person A delivers `getActiveContractForPeriod` | High | Use the `// TODO: TEMPORARY FALLBACK` pattern — Person B stubs the function locally, replaces at Hour 10 sync |
| Schema change after Hour 6 sync breaks Person B or C's code | High | No schema changes after Hour 6 without all-team agreement; Person A runs migration and notifies team on Slack/chat |
| Person C wires to a mock before Person B's API is ready | Medium | Use clearly marked `// TODO: wire real API` comments; never delete or hide these before the Hour 10 sync |
| Redis not running on demo machine | Medium | Person B's BullMQ worker should fail gracefully — the send-payslips route should catch ECONNREFUSED and return a 503 with message "Queue unavailable", not crash the server |
| PDF generation fails on demo machine (missing fonts) | Medium | `@react-pdf/renderer` bundles its own fonts — no system dependency. Test PDF generation at Hour 10 sync, not Hour 17. |
| `mathjs.evaluate` hangs on a circular formula | Low | The formula eval runs synchronously — if it hangs, the request hangs. Avoid circular formulas in seed data (BASIC → GROSS → BASIC would hang). Seed data rules are checked to be non-circular. |
| EMPLOYEE-role user sees other employees' data (security gap) | High | Person A must test this at Hour 6 and Hour 14. The security audit checklist is non-optional. |
| `WEB_ORIGIN`/`NEXT_PUBLIC_API_BASE_URL` mismatch after a LAN IP changes (e.g. someone's laptop reconnects to Wi-Fi and gets a new IP) | High (new in v3) | Check this FIRST if API calls start failing with unclear browser console errors — a CORS rejection looks like a broken route but is almost always a stale IP in one of the two env files. Re-confirm both values at every sync checkpoint, not just Hour 0. |
| Express error-handling middleware registered before routes instead of after | Medium (new in v3) | `errorHandler` must be the last `app.use()` in `index.ts`/`app.ts`. Verify this explicitly at Hour 6 sync — an easy one-line ordering mistake that silently swallows all error responses. |
| Two separate `npm test` runs (server/, web/) means someone only runs one and thinks the full suite passed | Medium (new in v3) | Hour 14 and Hour 17 checklists now explicitly list both test commands — run both, every time, not just the one for the folder you happened to edit. |

---

## Environment Variables — now TWO files, split by process (v3)

**`server/.env`** (Person A + Person B's machine, or wherever `server/` runs):
```env
DATABASE_URL="postgresql://[user]:[password]@[LAN_IP]:5432/peoplepay360"
JWT_SECRET="[minimum 32 character random string — set once, share securely across team]"
REDIS_HOST="localhost"
REDIS_PORT="6379"
PORT=4000
WEB_ORIGIN="http://[LAN_IP or localhost]:3000"     # must match wherever web/ actually runs — see Contract 8
NODE_ENV="development"
```

**`web/.env.local`** (Person C's machine, or wherever `web/` runs):
```env
NEXT_PUBLIC_API_BASE_URL="http://[LAN_IP or localhost]:4000"   # must match wherever server/ actually runs
```

**Both files must be in `.gitignore` from the first commit.** Confirm with `git check-ignore -v server/.env web/.env.local` before pushing — two files now, easy to forget the second one.

**LAN setup:** Postgres and Redis run on ONE machine (Person A's laptop recommended) — this part is unchanged. The Express `server/` process should run on that same machine for simplicity (it's already talking to Postgres/Redis locally). The Next.js `web/` process can run on Person C's own machine, connecting to `server/`'s LAN IP via `NEXT_PUBLIC_API_BASE_URL`. Whichever machine hosts `server/`, replace `[LAN_IP]` in **both** env files with that machine's local IP (e.g., `192.168.1.10`) — `DATABASE_URL`/`REDIS_HOST` point at it from `server/.env` (or stay `localhost` if server and DB are the same machine), and `NEXT_PUBLIC_API_BASE_URL`/`WEB_ORIGIN` point at/from it for the frontend-backend link.

---

## Final Pre-Demo Checklist (Hour 17)

- [ ] `cd server && npm run build` AND `cd web && npm run build` both complete with no errors — **two builds now, check both**
- [ ] Seed is current volume (50 employees, historical payruns) — re-run if needed: `cd server && npx prisma db seed`
- [ ] All 8 demo steps pass in a clean run without errors
- [ ] PDF downloads correctly
- [ ] Excel downloads correctly
- [ ] Live rule edit (Step 8) produces a visibly different net salary
- [ ] Audit log shows the actions performed during the demo
- [ ] Security: EMPLOYEE-role cannot access other employees' payslips
- [ ] No `.env` files in git history (`git log --all -- server/.env web/.env.local` returns nothing for both)
- [ ] Demo machine(s) on the same LAN as the Postgres/Redis machine (or running locally)
- [ ] `cd server && npm run dev` starts without errors on :4000; `cd web && npm run dev` starts without errors on :3000 — **confirm on the actual demo machine(s), not just a dev laptop**, since a fresh network can silently break the `WEB_ORIGIN`/`NEXT_PUBLIC_API_BASE_URL` pairing (see risk table above)
- [ ] Browser DevTools Network tab shows zero CORS errors during a full click-through of the demo script, checked on the actual demo machine minutes before presenting
