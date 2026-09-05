# BUILD_PERSON_C.md — Person C (Frontend & Dashboard)
> ⚠️ AGENT INSTRUCTIONS: You are building ONLY the items in this file. Nothing else. Build exactly as specified. If anything is unclear, output `// UNCLEAR: [question]` and stop. Do not proceed past unclear points.

> ⚠️ **ARCHITECTURE CHANGE — READ THIS FIRST:** Your project is now Next.js **frontend-only** — it lives at `web/` and has **no `app/api/*` routes at all anymore**, including the dashboard route you used to own. `GET /api/dashboard` moves to `server/src/routes/dashboard.ts` as an Express route (still written by you, since you define its shape, but it now lives in Person A/B's `server/` process and is mounted into their Express app). Everything else you own — every screen, every component, the Wizard, the Dashboard UI — is unchanged. Read **"Express Migration Addendum"** at the end of this file before building `lib/api.ts` or the dashboard route.

---

## Your Scope

You own **every pixel the judge sees** and the data aggregation endpoint that powers the dashboard. Your deliverables are:

- Shared layout, navigation, and auth state
- All UI screens (list, form, detail views for every module)
- The Payrun Creation Wizard (2-step)
- The Payrun Processing screen
- Payslip Detail + Print/Download
- Payroll Dashboard (KPI cards, chart, filters)
- `GET /api/dashboard` endpoint (Person C owns this one API route)
- Excel download button wiring

**You depend on Person A for:** all employee/contract/schedule/attendance/timeoff API routes  
**You depend on Person B for:** all payroll/payslip API routes, PDF endpoint, Excel endpoint  
**Do NOT call any API route that doesn't exist yet** — use mock data with a clearly marked `// TODO: wire real API` comment until Person A/B deliver their routes.

---

## Your Files (exact paths — do not rename)

```
/app/layout.tsx                         ← root layout, font, global CSS
/app/page.tsx                           ← redirects to /login or /dashboard
/app/(auth)/login/page.tsx
/app/(dashboard)/layout.tsx             ← nav + auth wrapper
/app/(dashboard)/dashboard/page.tsx     ← Payroll Dashboard
/app/(dashboard)/employees/page.tsx     ← Employee List (List + Kanban toggle)
/app/(dashboard)/employees/[id]/page.tsx   ← Employee Form + smart buttons
/app/(dashboard)/employees/new/page.tsx
/app/(dashboard)/contracts/page.tsx
/app/(dashboard)/contracts/[id]/page.tsx
/app/(dashboard)/contracts/new/page.tsx
/app/(dashboard)/schedules/page.tsx
/app/(dashboard)/schedules/[id]/page.tsx
/app/(dashboard)/attendance/page.tsx
/app/(dashboard)/attendance/[id]/page.tsx
/app/(dashboard)/timeoff/requests/page.tsx
/app/(dashboard)/timeoff/allocations/page.tsx
/app/(dashboard)/timeoff/types/page.tsx
/app/(dashboard)/payroll/page.tsx          ← Payrun list
/app/(dashboard)/payroll/new/page.tsx      ← Wizard Step 1
/app/(dashboard)/payroll/[id]/page.tsx     ← Payrun Processing screen
/app/(dashboard)/payslips/page.tsx         ← Payslip list
/app/(dashboard)/payslips/[id]/page.tsx    ← Payslip detail + print
/app/(dashboard)/salary-structures/page.tsx
/app/(dashboard)/salary-structures/[id]/page.tsx
/app/(dashboard)/salary-rules/page.tsx
/app/(dashboard)/salary-rules/new/page.tsx
/app/(dashboard)/salary-rules/[id]/page.tsx
/app/(dashboard)/audit-log/page.tsx        ← read-only log view
/components/ui/                            ← shared UI primitives (Button, Input, Select, Table, Badge, Card, Modal)
/components/layout/Nav.tsx
/components/layout/TopBar.tsx
/lib/api.ts                               ← shared fetch wrapper with auth token
/lib/auth-client.ts                       ← client-side session (localStorage token, user context)
/app/api/dashboard/route.ts               ← YOU own this one API route
/__tests__/person-c/                      ← all your tests go here
```

---

## Task 0: Read Reference File First

**Before writing a single line of UI code**, open and read every file in `/reference/frontend-base/`. Extract:

1. The exact color values (hex or CSS variable names) for: primary, secondary, background, surface, text, border, danger, success, warning
2. The spacing scale (how many px/rem units are used for padding, margin, gap)
3. The font family and size scale (what heading sizes exist, what body/label sizes exist)
4. The exact pattern for: buttons (primary, secondary, ghost), table rows, card containers, badge/status chips, form inputs, modal/dialog
5. The nav structure: top nav or sidebar? what's the layout of nav links?

If no reference file exists yet, **stop and ask Person A to create it** — do not invent a design system.

If for some reason `/reference/frontend-base/` is completely empty, use these defaults (and note in every file that these are fallbacks):
```css
:root {
  --color-primary: #4F46E5;      /* indigo-600 */
  --color-primary-hover: #4338CA;
  --color-surface: #FFFFFF;
  --color-bg: #F9FAFB;
  --color-border: #E5E7EB;
  --color-text: #111827;
  --color-text-muted: #6B7280;
  --color-success: #16A34A;
  --color-warning: #CA8A04;
  --color-danger: #DC2626;
  --font-family: 'Inter', system-ui, sans-serif;
  --radius: 6px;
}
```

---

## Task 1: Auth State + Fetch Wrapper

**File: `/lib/auth-client.ts`**
```typescript
'use client';
// Stores and reads the JWT from localStorage
// Provides: getToken(), setToken(t), clearToken(), getSession() -> { userId, email, role, employeeId } | null

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pp360_token');
}
export function setToken(token: string): void { localStorage.setItem('pp360_token', token); }
export function clearToken(): void { localStorage.removeItem('pp360_token'); }
export function getSession() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload as { userId: string; email: string; role: string; employeeId?: string };
  } catch { return null; }
}
```

**File: `/lib/api.ts`**
```typescript
import { getToken } from './auth-client';

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error ${res.status}`);
  }
  return res.json();
}
```

**Acceptance criteria:** Every API call in the UI goes through `apiFetch`. No raw `fetch` calls with manually constructed headers.

---

## Task 2: Root Layout + Nav

**`/app/(dashboard)/layout.tsx`** — wraps all authenticated pages:
- Reads session from `getSession()` on mount
- If no session (no token), redirects to `/login`
- Renders the top navigation bar

**Nav links and role visibility:**
| Link | Visible to |
|------|-----------|
| Dashboard | All |
| Employees | All |
| Contracts | All |
| Attendance | All |
| Time Off | All |
| Payroll (Payruns) | HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN |
| Payslips | All |
| Salary Structures | HR_PAYROLL_MANAGER, ADMIN |
| Audit Log | HR_PAYROLL_MANAGER, ADMIN |
| Sign Out | All |

**Sign Out** clears the token and redirects to `/login`.

---

## Task 3: Login Page

**`/app/(auth)/login/page.tsx`**
- Email + Password form inputs
- On submit: `POST /api/auth/login` → on success: save token, redirect to `/dashboard`
- On error: show inline error message (do not use alert/confirm)
- No registration form — login only

---

## Task 4: Employee Screens

### Employee List (`/app/(dashboard)/employees/page.tsx`)

**Toggle between List view and Kanban view.** Default: List view.

**List view:** Table with columns: Name | Department | Job Position | Schedule | Status | Contracts (count) | Attendance (count) | Actions (View, Edit)
- Status shown as a colored Badge (active = success color, inactive = muted)
- "New Employee" button visible to HR_MANAGER, HR_PAYROLL_MANAGER, ADMIN; hidden for EMPLOYEE and HR_PAYROLL_USER

**Kanban view:** NOT drag-and-drop. A static read-only display. Group employees into columns by department (one column per unique department). Each employee card shows: name, job position, status badge. No actions in Kanban cards.

### Employee Form (`/app/(dashboard)/employees/[id]/page.tsx`)

Tabs/sections: Identity (name, email/user, department, job position), Schedule (scheduleId dropdown), Manager (managerId dropdown from employee list), Status, Bank Account Number.

**Smart Buttons** (displayed as button-links with counts — click navigates to the filtered list):
- "Contracts (N)" → navigates to `/contracts?employeeId=[id]`
- "Attendance (N)" → navigates to `/attendance?employeeId=[id]`
- "Time Off (N)" → navigates to `/timeoff/requests?employeeId=[id]`
- "Allocations (N)" → navigates to `/timeoff/allocations?employeeId=[id]`

Counts come from `_count` in the employee detail response — do NOT make separate API calls for counts.

**Edge case:** If employee has no contracts yet, the page must not crash — the Contracts smart button shows "(0)" and the contracts section shows "No contracts yet."

---

## Task 5: Contract Screens

**List view** (`/contracts/page.tsx`): supports `?employeeId=` filter (when navigated from Employee smart button).
- Columns: Employee | Department | Position | Wage | Start Date | End Date | Structure | Status | Actions
- The currently active contract row must be visually highlighted (e.g., green left border or background tint — use the success color from the reference file)
- Status badge: active (success), expired (muted), draft (warning)

**Form view** (`/contracts/[id]/page.tsx`, `/contracts/new/page.tsx`):
- Fields: Employee (dropdown), Start Date, End Date, Wage, Department, Position, Salary Structure (dropdown), Status
- On save: handle 409 error from the API (overlapping active contract) — show the API's error message inline

---

## Task 6: Working Schedule Screens

**List view:** Columns: Name | Type | Weekly Hours | Employees Assigned | Actions
- `weeklyHours` comes from the API response field — display it as "X hours/week", do NOT recompute

**Form view:**
- Name, Type (text input)
- Schedule grid: rows for each day of the week, columns: Day | Start Time | End Time | Break (mins)
- "Add Day" button adds a new row
- Weekly hours preview: display the `weeklyHours` value returned by the API after save, or compute client-side for the preview only — but the stored and displayed "official" value is always from the API

---

## Task 7: Attendance Screens

**List view** — global (all employees, with filters) or per-employee (via Employee smart button link):
- Filters: Employee (dropdown), Date range (from/to), Status
- Columns: Employee | Check In | Check Out | Worked Hours | Status | Actions
- Rows with `status: 'exception'` must be visually flagged (e.g., warning color background or icon)

**Form view:** Check In (datetime), Check Out (datetime), Status dropdown (normal/exception/corrected). Worked Hours is read-only (comes from API, computed server-side).

---

## Task 8: Time Off Screens

### Requests (`/timeoff/requests/page.tsx`)
- Columns: Employee | Type | From | To | Duration | Status | Actions
- Status filter dropdown
- "New Request" button (visible to EMPLOYEE and HR roles)
- Request Form: Employee (HR selects; EMPLOYEE defaults to self), Type, Start Date, End Date, Duration (auto-calculated client-side as days between dates)
- After approving: call `PATCH /api/timeoff/requests/[id]/approve` → on success, refetch the list without page reload (update React state). The remaining balance on the Allocations page must reflect the change on next load.

### Allocations (`/timeoff/allocations/page.tsx`)
- Columns: Employee | Type | Allocated | Taken | Remaining | Valid From | Valid To | Approved | Actions
- **`remaining` is read from the API response field** — do NOT compute `allocated - taken` in the frontend
- Show "Approve Allocation" button if `approved: false` (HR_MANAGER + above only)

### Time Off Types (`/timeoff/types/page.tsx`)
- Simple CRUD table + form. Columns: Name | Unit | Requires Allocation | Payroll Integrated | Actions

---

## Task 9: Salary Structure + Rule Screens

**Salary Structure List** (`/salary-structures/page.tsx`) — visible to HR_PAYROLL_USER+:
- Columns: Name | Rules Count | Actions

**Salary Structure Form** (`/salary-structures/[id]/page.tsx`):
- Name field
- Embedded table of its Salary Rules (sorted by sequence), with inline "Edit" and "Add Rule" buttons

**Salary Rule Form** (`/salary-rules/[id]/page.tsx`, `/salary-rules/new/page.tsx`):
- Fields: Name, Code (uppercase, validated client-side with `/^[A-Z_]+$/`), Category (dropdown: Basic/Allowance/Gross/Deduction/Net), Sequence (number), Computation Method (dropdown: fixed/percentage/formula)
- **Conditional fields based on Computation Method:**
  - `fixed` → show Amount field only
  - `percentage` → show "Percentage Of" (text, e.g. "BASIC"), "Percentage Value" (number 0-100)
  - `formula` → show Formula textarea (with placeholder "e.g. BASIC + HRA")
- All other conditional fields hide when not relevant
- On save: handle API validation errors (e.g., missing formula when method is formula) — show inline

---

## Task 10: Payrun Creation Wizard

**`/app/(dashboard)/payroll/new/page.tsx`** — Two-step wizard. Do not create the Payrun until Step 2 is confirmed.

**Step 1: Define Scope**
- Form fields: Run Name (text), Period Start (date), Period End (date), Salary Structure (dropdown from `GET /api/salary-structures`)
- "Continue" button → does NOT call any API yet. Stores Step 1 data in local React state and renders Step 2.

**Step 2: Select Employees**
- On entering Step 2, call `GET /api/payruns/[step1Data]/eligible-employees` — **but the payrun doesn't exist yet**. Since the payrun is created at the end of Step 2, use a different approach: temporarily POST the payrun to get an ID (status stays 'draft'), then fetch eligible employees for it. OR — pass periodStart, periodEnd, and salaryStructureId as query params to a separate route. **Implement whichever approach is simpler — the integration contract just requires eligible employees to be fetched correctly before the user finalizes.**
- Show a table of eligible employees with checkboxes: Name | Department | Wage | Status
- "Select All" / "Deselect All" checkbox in the header
- Count of selected employees shown below the table
- "Back" button returns to Step 1 without losing Step 1 data
- "Create Payrun" button:
  1. If payrun not yet created: POST to `/api/payruns` with Step 1 data
  2. POST to `/api/payruns/[id]/employees` with selected employee IDs
  3. Redirect to `/payroll/[id]`

---

## Task 11: Payrun Processing Screen

**`/app/(dashboard)/payroll/[id]/page.tsx`** — fetches from `GET /api/payruns/[id]`.

**Top section:**
- Run Name, Period (formatted as "1 Jul 2026 – 31 Jul 2026"), Salary Structure name
- Status badge (draft → computed → validated → paid, color-coded)

**Action buttons** — visibility and state based on `payrun.status`:

| Button | Visible when | Calls |
|--------|-------------|-------|
| Compute | status is 'draft' or 'computed' | POST /api/payruns/[id]/compute |
| Validate | status is 'computed' | POST /api/payruns/[id]/validate |
| Mark Paid | status is 'validated' | POST /api/payruns/[id]/mark-paid |
| Send Payslips | status is 'validated' or 'paid' | POST /api/payruns/[id]/send-payslips |
| Download Excel | always | GET /api/payslips/export-excel?payrunId=[id] |

After any action button succeeds: refetch the payrun and re-render (no page reload — update state).

**Warning banner:** If any payslip has non-empty `warnings`, show a yellow banner at the top listing each warning. Example: "3 payslips have warnings: [emp name]: missing bank details".

**Payslip list table:**
- Columns: Employee | Department | Worked Days | Net Salary | Status | Warnings | View
- Net Salary formatted with Indian number formatting (commas, e.g. "₹32,400")
- "View" link → navigates to `/payslips/[id]`

**Polling for Compute:** After clicking Compute, show a loading spinner. Poll `GET /api/payruns/[id]` every 2 seconds until `status` changes from 'draft' to 'computed'. Then stop polling and re-render. This replaces WebSockets — no Socket.IO.

---

## Task 12: Payslip Detail + Print

**`/app/(dashboard)/payslips/[id]/page.tsx`** — fetches from `GET /api/payslips/[id]`.

**Header section:**
- Employee name, department
- Payrun name, period
- Worked days, status badge

**Salary Computation table** — group lines by category in this order: Basic → Allowance → Gross → Deduction → Net:
```
BASIC SALARY
  Basic         ₹30,000

ALLOWANCES
  HRA           ₹6,000

GROSS SALARY
  Gross         ₹36,000

DEDUCTIONS
  Provident Fund  ₹3,600

NET SALARY              ← bold, larger font, use primary or success color
  Net Salary    ₹32,400
```

**Buttons:**
- "Download PDF" → `GET /api/payslips/[id]/pdf` — opens in new tab or triggers download
- "Back to Payrun" → navigates back to the parent payrun

**Warning display:** If `warnings` is non-empty, show each warning in an orange/warning-color box above the computation table.

---

## Task 13: Payroll Dashboard

**`/app/(dashboard)/dashboard/page.tsx`** — fetches from `GET /api/dashboard`.

**Filters (at the top, update dashboard data on change):**
- Period: Month/Year dropdowns (last 12 months as options)
- Department: dropdown (all departments from employee list)

**KPI Cards (5 cards in a row):**
1. Total Net Salary Paid — sum of netSalary for all paid payslips in the period
2. Payslips Generated — count of payslips in the period
3. Average Salary — (Total Net Paid / Payslip count)
4. Approved Time Off — count of approved TimeOffRequests in the period
5. Attendance Health — (Present days / Total expected days) as a percentage

**Chart:**
- Department-cost bar chart: X axis = department name, Y axis = total net salary for that department in the selected period
- Use a simple inline chart (you can use a lightweight lib like recharts if it's already installed, or render a simple SVG bar chart manually)

**Operational Alerts section:**
- List payruns in 'computed' status (need validation) — show "N payruns awaiting validation"
- List employees with no bank account details — show "N employees missing bank account"
- List payslips with warnings — show count

**Attendance & Time Off section:**
- Present today (employees with a check-in today and no check-out = in-office now): count
- Pending Time Off Requests: count with link to `/timeoff/requests?status=pending`
- Employees with leave today: count

---

## Task 14: `GET /api/dashboard` Route

**This is the only API route Person C owns.** All data comes from Prisma aggregates run in parallel. Never fetch all rows and sum in JS.

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, requireRole, handleApiError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    requireRole(session, ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN', 'HR_MANAGER']);

    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department') ?? undefined;
    const periodStart = searchParams.get('periodStart')
      ? new Date(searchParams.get('periodStart')!)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1); // start of current month
    const periodEnd = searchParams.get('periodEnd')
      ? new Date(searchParams.get('periodEnd')!)
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0); // end of current month

    const payslipWhere = {
      status: 'paid',
      payrun: { periodStart: { gte: periodStart }, periodEnd: { lte: periodEnd } },
      ...(department ? { employee: { department } } : {}),
    } as const;

    const [
      netPaidAgg,
      payslipCount,
      approvedTimeOff,
      departmentCost,
      pendingPayruns,
      missingBankCount,
      warnedPayslips,
      attendanceToday,
      pendingTimeOff,
    ] = await Promise.all([
      // Total net paid
      prisma.payslip.aggregate({ where: payslipWhere, _sum: { netSalary: true } }),
      // Payslip count
      prisma.payslip.count({ where: payslipWhere }),
      // Approved time off
      prisma.timeOffRequest.count({
        where: {
          status: 'approved',
          startDate: { gte: periodStart },
          endDate: { lte: periodEnd },
        },
      }),
      // Department cost (groupBy)
      prisma.payslip.groupBy({
        by: ['employeeId'],
        where: payslipWhere,
        _sum: { netSalary: true },
      }),
      // Payruns needing validation
      prisma.payrun.count({ where: { status: 'computed' } }),
      // Missing bank details
      prisma.employee.count({ where: { bankAccountNumber: null, status: 'active' } }),
      // Payslips with warnings (not empty array)
      prisma.payslip.count({ where: { ...payslipWhere, warnings: { isEmpty: false } } }),
      // Attendance today (checked in, no check-out)
      prisma.attendance.count({
        where: {
          checkIn: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          checkOut: null,
        },
      }),
      // Pending time off
      prisma.timeOffRequest.count({ where: { status: 'pending' } }),
    ]);

    // Build department cost map — need department names
    // For simplicity, fetch all employees in these groups to get their departments
    const empIds = departmentCost.map((d) => d.employeeId);
    const emps = await prisma.employee.findMany({
      where: { id: { in: empIds } },
      select: { id: true, department: true },
    });
    const empMap = Object.fromEntries(emps.map((e) => [e.id, e.department]));
    const deptCostMap: Record<string, number> = {};
    for (const row of departmentCost) {
      const dept = empMap[row.employeeId] ?? 'Unknown';
      deptCostMap[dept] = (deptCostMap[dept] ?? 0) + (row._sum.netSalary ?? 0);
    }

    const totalNet = netPaidAgg._sum.netSalary ?? 0;
    return Response.json({
      totalNetPaid: totalNet,
      payslipCount,
      averageSalary: payslipCount > 0 ? Math.round(totalNet / payslipCount) : 0,
      approvedTimeOff,
      departmentCost: Object.entries(deptCostMap).map(([dept, total]) => ({ dept, total })),
      alerts: { pendingPayruns, missingBankCount, warnedPayslips },
      attendance: { presentToday: attendanceToday, pendingTimeOff },
    });
  } catch (err) { return handleApiError(err); }
}
```

---

## Task 15: Audit Log Screen

**`/app/(dashboard)/audit-log/page.tsx`** — read-only, visible to HR_PAYROLL_MANAGER and ADMIN.

- Fetches `GET /api/audit-log`
- Filters: User, Entity Type, Date range
- Table: Timestamp | User | Action | Entity Type | Entity ID | Details
- Details column: show as a collapsed/expandable JSON view (a `<details>` HTML element is fine)

---

## Tests You Must Write (do not skip)

Create files in `/__tests__/person-c/`.

**1. `employee-form.test.tsx`** — Component tests using React Testing Library:
- Employee Form renders correctly when employee has zero related contracts (no crash)
- Employee Form renders correctly when employee has multiple contracts, shows all
- Smart button shows "(0)" when there are no related records

**2. `payrun-processing.test.tsx`** — Component tests:
- "Mark Paid" button is disabled/absent when payrun status is 'computed' (not yet validated)
- "Validate" button is absent when payrun status is 'draft' (not yet computed)
- "Compute" button is absent when payrun status is 'paid'
- Warning banner appears when any payslip has non-empty warnings
- Warning banner is absent when all payslips have empty warnings

**3. `timeoff-approve.test.tsx`** — Integration test:
- Approving a Time Off Request in the UI (clicking Approve button) causes the displayed list to update the status from 'pending' to 'approved' without a page reload

**4. `security.test.tsx`** — UI-level security tests (these are NOT optional — a hidden nav link is a UX nicety, not a security boundary, so these tests must prove BOTH that links are hidden AND that the underlying API still rejects the call):

```typescript
// /__tests__/person-c/security.test.tsx
// These tests cover the ONE thing Person C is responsible for security-wise:
// nav-link visibility must match role, AND must never be the only line of defense.
// The API-level 403 is Person A/B's job (see their security.test.ts) — here we only
// confirm the UI doesn't render actions it shouldn't, and that if a user reaches a
// route directly (e.g. by typing the URL), the page handles a 403 response gracefully
// instead of crashing or silently showing stale/empty state as if it succeeded.

describe('Nav link visibility by role', () => {
  test('EMPLOYEE session: "Payroll" link is not rendered', () => {
    renderNavWithSession({ role: 'EMPLOYEE' });
    expect(screen.queryByText('Payroll')).not.toBeInTheDocument();
  });

  test('EMPLOYEE session: "Salary Structures" link is not rendered', () => {
    renderNavWithSession({ role: 'EMPLOYEE' });
    expect(screen.queryByText('Salary Structures')).not.toBeInTheDocument();
  });

  test('EMPLOYEE session: "Audit Log" link is not rendered', () => {
    renderNavWithSession({ role: 'EMPLOYEE' });
    expect(screen.queryByText('Audit Log')).not.toBeInTheDocument();
  });

  test('HR_MANAGER session: "Payroll" and "Salary Structures" links are not rendered', () => {
    renderNavWithSession({ role: 'HR_MANAGER' });
    expect(screen.queryByText('Payroll')).not.toBeInTheDocument();
    expect(screen.queryByText('Salary Structures')).not.toBeInTheDocument();
  });

  test('HR_PAYROLL_MANAGER session: all links including "Salary Structures" and "Audit Log" are rendered', () => {
    renderNavWithSession({ role: 'HR_PAYROLL_MANAGER' });
    expect(screen.getByText('Payroll')).toBeInTheDocument();
    expect(screen.getByText('Salary Structures')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
  });
});

describe('Action buttons hidden by role (not just disabled by CSS)', () => {
  test('EMPLOYEE session on Employee List: "New Employee" button is not rendered', () => {
    renderEmployeeListWithSession({ role: 'EMPLOYEE' });
    expect(screen.queryByRole('button', { name: /new employee/i })).not.toBeInTheDocument();
  });

  test('HR_PAYROLL_USER session on Salary Rule screen: no "Save"/"Delete" buttons rendered (read-only role)', () => {
    renderSalaryRuleFormWithSession({ role: 'HR_PAYROLL_USER' });
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});

describe('Direct-URL access is not trusted — page must handle a 403 response, not assume success', () => {
  // Simulates a user typing /salary-structures into the URL bar directly as an EMPLOYEE,
  // bypassing the nav entirely. apiFetch will receive a real 403 from Person B's route.
  // This test exists because a hidden link is not a security control — it is a UX nicety.
  // The test asserts the PAGE does not silently render an empty table (which would look
  // like "no data" rather than "not allowed") and does not throw an unhandled exception.

  test('Salary Structures page catches a 403 from apiFetch and shows an access-denied message, not a blank/crashed screen', async () => {
    mockApiFetch('/api/salary-structures', { status: 403, error: 'Forbidden' });
    render(<SalaryStructuresPage />);
    await waitFor(() => {
      expect(screen.getByText(/forbidden|not authorized|access denied/i)).toBeInTheDocument();
    });
  });

  test('Audit Log page catches a 403 from apiFetch and shows an access-denied message, not a blank/crashed screen', async () => {
    mockApiFetch('/api/audit-log', { status: 403, error: 'Forbidden' });
    render(<AuditLogPage />);
    await waitFor(() => {
      expect(screen.getByText(/forbidden|not authorized|access denied/i)).toBeInTheDocument();
    });
  });

  test('Payslip detail page for another employee\'s payslip catches 403 and does not render any salary line items', async () => {
    mockApiFetch(/\/api\/payslips\/.+/, { status: 403, error: 'Forbidden' });
    render(<PayslipDetailPage payslipId="not-mine" />);
    await waitFor(() => {
      expect(screen.getByText(/forbidden|not authorized|access denied/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/net salary/i)).not.toBeInTheDocument();
  });
});

describe('Auth token handling', () => {
  test('No token in localStorage → dashboard layout redirects to /login instead of rendering nav with undefined session', () => {
    clearToken();
    renderDashboardLayout();
    expect(mockRouterPush).toHaveBeenCalledWith('/login');
  });

  test('Sign Out clears the token and any cached session state (no stale role visible after logout)', () => {
    setToken(validEmployeeToken);
    renderNavWithSession({ role: 'EMPLOYEE' });
    fireEvent.click(screen.getByText('Sign Out'));
    expect(getToken()).toBeNull();
  });
});
```

**Manual visual + security check (not automated — do this yourself for each screen as you build it):**
- Every built screen matches the reference file's colors, spacing, and typography
- No screen throws a React error with empty/null data
- Role-based nav links: sign in as EMPLOYEE → confirm no "Payroll", "Salary Structures", or "Audit Log" link visible; sign in as HR_MANAGER → confirm no "Payroll" or "Salary Structures" link visible
- Try navigating directly to `/salary-structures` or `/payroll` by typing the URL while signed in as EMPLOYEE — confirm the page shows an access-denied state, not a crash, blank table, or (worse) actual data

---

## Contracts You Must Honor

- Read `weeklyHours` from the schedule API response — do NOT recompute client-side
- Read `remaining` (Time Off balance) from the allocation API response — do NOT compute `allocated - taken` client-side
- `GET /api/payruns/:id` response shape — Person B defines this; Person C reads it exactly as specified in BUILD_PERSON_B.md Task 5
- `GET /api/payslips/:id` response shape — Person B defines this; Person C reads it exactly as specified in BUILD_PERSON_B.md Task 10
- `GET /api/dashboard` response shape — Person C defines and owns this; do not deviate from the structure in Task 14

## DO NOT

- Do not recompute `weeklyHours` client-side — read from the API
- Do not recompute `remaining` (Time Off balance) client-side — read from the API
- Do not implement drag-and-drop in the Kanban view — it is read-only grouped display only
- Do not call Resend, external email APIs, or any third-party service
- Do not use WebSockets or Socket.IO — use 2-second polling for the Compute status update
- Do not build API routes other than `GET /api/dashboard`
- Do not add a component library's default styling (shadcn default, MUI, etc.) unless it exactly matches the reference file
- Do not store auth token anywhere other than localStorage via the `auth-client.ts` helper
- Do not use `alert()` or `confirm()` anywhere — all messages must be inline UI
- Do not treat hiding a nav link or button as sufficient access control — it is a UX nicety only; the real enforcement is the 403 that Person A/B's API routes return, and every page that calls a restricted route must handle a 403 response explicitly (see `security.test.tsx`)

---

## EXPRESS MIGRATION ADDENDUM (v3 — read before building lib/api.ts or the dashboard route)

### What changes for you

1. **Your project root is now `web/`, not the repo root.** All your file paths in the "Your Files" list above are relative to `web/` (e.g. `web/lib/api.ts`, `web/app/(dashboard)/dashboard/page.tsx`).
2. **`lib/api.ts` needs an absolute base URL**, since the frontend (port 3000) and backend (port 4000) are different origins:

```typescript
// web/lib/api.ts
import { getToken } from './auth-client';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error ${res.status}`);
  }
  return res.json();
}
```

Set `NEXT_PUBLIC_API_BASE_URL` in `web/.env.local` (gitignored, same as before). Every existing call site (`apiFetch('/api/employees')`, etc.) needs zero changes — only this one file's internals change.

3. **`GET /api/dashboard` is no longer your file.** You still **write the route** (you define its shape, its Prisma aggregate queries, its response contract — Task 14's code is unchanged) but it now lives at `server/src/routes/dashboard.ts`, coded as an Express router, and Person A mounts it in `server/src/index.ts` alongside their own routes. Practically: hand the Task 14 code (converted to the Express pattern below) to whoever is committing to `server/`, or commit it yourself into `server/src/routes/dashboard.ts` if your team shares that repo folder freely. Either way, your consuming page (`web/app/(dashboard)/dashboard/page.tsx`) calls it exactly the same way as any other route: `apiFetch('/api/dashboard?department=...')`.

**Your Task 14 code, converted to Express (same Prisma logic, same response shape — copy this instead of the original Next.js version):**

```typescript
// server/src/routes/dashboard.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/', requireAuth, requireRole(['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN', 'HR_MANAGER']), asyncHandler(async (req, res) => {
  const department = req.query.department as string | undefined;
  const periodStart = req.query.periodStart ? new Date(req.query.periodStart as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const periodEnd = req.query.periodEnd ? new Date(req.query.periodEnd as string) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

  // ... identical Promise.all aggregate block from the original Task 14 ...

  res.json({
    totalNetPaid: totalNet,
    payslipCount,
    averageSalary: payslipCount > 0 ? Math.round(totalNet / payslipCount) : 0,
    approvedTimeOff,
    departmentCost: Object.entries(deptCostMap).map(([dept, total]) => ({ dept, total })),
    alerts: { pendingPayruns, missingBankCount, warnedPayslips },
    attendance: { presentToday: attendanceToday, pendingTimeOff },
  });
}));

export default router;
```

Mounted in `server/src/index.ts` as `app.use('/api/dashboard', dashboardRoutes)` — same path your frontend already calls, so `web/app/(dashboard)/dashboard/page.tsx` needs no changes at all.

### Updated Contracts You Must Honor (v3 addition)

- `GET /api/dashboard` response shape — still yours to define, per original Task 14, but the file physically lives in `server/`, not `web/`. Do not let this ownership split cause the shape to drift — it's still the single contract in `INTEGRATION.md`'s "Contract 5."

### New test — CORS/cross-origin failure handling (add to `security.test.tsx`)

```typescript
describe('Cross-origin / network failure handling — new in v3', () => {
  // Simulates the backend rejecting a request due to a CORS misconfiguration or being
  // completely unreachable (wrong NEXT_PUBLIC_API_BASE_URL, server down, etc.) — this is a
  // new failure mode introduced specifically by having two separate origins/processes.
  test('Dashboard page shows a clear error state (not a blank screen or unhandled promise rejection) when apiFetch throws a network/CORS error', async () => {
    mockApiFetchToThrow('/api/dashboard', new TypeError('Failed to fetch'));
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/unable to load|connection error|try again/i)).toBeInTheDocument();
    });
  });

  test('Employee List page shows the same graceful error state on a network failure, not a crash', async () => {
    mockApiFetchToThrow('/api/employees', new TypeError('Failed to fetch'));
    render(<EmployeeListPage />);
    await waitFor(() => {
      expect(screen.getByText(/unable to load|connection error|try again/i)).toBeInTheDocument();
    });
  });
});
```

**Acceptance criteria (v3 addition):** Every page-level `apiFetch` call is wrapped so that a thrown network error (distinct from a `403`/`401`, which are handled responses, not thrown exceptions) results in a visible inline error state — never a silent blank page, never an unhandled promise rejection in the console during the demo.
