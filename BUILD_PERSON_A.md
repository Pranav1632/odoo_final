# BUILD_PERSON_A.md — Person A (Data & Core HR)
> ⚠️ AGENT INSTRUCTIONS: You are building ONLY the items in this file. Nothing else. Build exactly as specified. If anything is unclear, output `// UNCLEAR: [question]` and stop. Do not proceed past unclear points.

> ⚠️ **ARCHITECTURE CHANGE — READ THIS FIRST:** This build now uses **Next.js (frontend, `web/`) + Express (backend, `server/`)** as two separate processes, not Next.js API routes. Every route below that says `/app/api/...` now lives at `server/src/routes/...` as an Express router, mounted in `server/src/index.ts`. You additionally own the Express app shell itself (`index.ts`, `middleware/auth.ts`, `middleware/errorHandler.ts`) since no one else's code can run without it. Read **"Express Migration Addendum"** at the end of this file before writing any route — it has the exact middleware pattern, the new file paths, and the rewritten test setup. Everything else in this file (business logic, acceptance criteria, seed spec) is unchanged.

---

## Your Scope

You own the **entire foundation** that Persons B and C depend on. Nothing works without your code shipping first. Your deliverables are:

- Project scaffolding and shared library files
- Auth (login, JWT, session, role guard)
- Prisma schema + migrations + seed script
- Employee CRUD
- Contract CRUD
- Working Schedule CRUD
- Attendance CRUD
- Time Off: Types, Allocations, Requests (including approve/refuse)
- Audit Log system (shared DB table + helper)
- Local Error Log system (shared DB table + helper)

---

## Your Files (exact paths — do not rename)

```
/lib/prisma.ts                          ← singleton Prisma client
/lib/auth.ts                            ← JWT, getSessionUser, requireRole, ApiError
/lib/contracts.ts                       ← getActiveContractForPeriod (Person B depends on this)
/lib/audit.ts                           ← writeAuditLog helper (everyone calls this)
/lib/errorLog.ts                        ← writeErrorLog helper (everyone calls this)
/lib/attendance.ts                      ← getWorkedDaysForPeriod (Person B depends on this)
/prisma/schema.prisma                   ← full schema (you own all migrations)
/prisma/seed.ts                         ← full seed script
/app/api/auth/login/route.ts
/app/api/employees/route.ts             ← GET (list), POST (create)
/app/api/employees/[id]/route.ts        ← GET, PATCH, DELETE
/app/api/contracts/route.ts             ← GET (list), POST (create)
/app/api/contracts/[id]/route.ts        ← GET, PATCH, DELETE
/app/api/schedules/route.ts             ← GET (list), POST (create)
/app/api/schedules/[id]/route.ts        ← GET, PATCH, DELETE
/app/api/attendance/route.ts            ← GET (list), POST (create)
/app/api/attendance/[id]/route.ts       ← GET, PATCH, DELETE
/app/api/timeoff/types/route.ts
/app/api/timeoff/types/[id]/route.ts
/app/api/timeoff/allocations/route.ts
/app/api/timeoff/allocations/[id]/route.ts
/app/api/timeoff/requests/route.ts
/app/api/timeoff/requests/[id]/route.ts
/app/api/timeoff/requests/[id]/approve/route.ts
/app/api/timeoff/requests/[id]/refuse/route.ts
/app/api/audit-log/route.ts             ← GET only (HR_PAYROLL_MANAGER / ADMIN)
/app/api/error-log/route.ts             ← GET only (ADMIN only)
/__tests__/person-a/                    ← all your tests go here
```

---

## Task 1: Project Setup & Shared Libraries

**What to build:** Initialize the Next.js project, install all dependencies, write the three shared library files that everyone imports. These must be done before any API route.

**Commands (run in order, exactly):**
```bash
npx create-next-app@latest peoplepay360 --typescript --tailwind --app
cd peoplepay360
npm i prisma @prisma/client mathjs bcryptjs jsonwebtoken zod @react-pdf/renderer exceljs bullmq ioredis
npm i -D @types/bcryptjs @types/jsonwebtoken ts-node
```

**File: `/lib/prisma.ts`**
```typescript
import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**File: `/lib/auth.ts`**
```typescript
import jwt from 'jsonwebtoken';

export interface Session {
  userId: string;
  email: string;
  role: string;
  employeeId?: string;
}

export function getSessionUser(req: Request): Session {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) throw new ApiError(401, 'Unauthorized');
  return jwt.verify(token, process.env.JWT_SECRET!) as Session;
}

export function requireRole(session: Session, allowed: string[]) {
  if (!allowed.includes(session.role)) throw new ApiError(403, 'Forbidden');
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error('[API ERROR]', err);
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}
```

**File: `/lib/contracts.ts`**
```typescript
import { prisma } from './prisma';

export async function getActiveContractForPeriod(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date
) {
  return prisma.contract.findFirst({
    where: {
      employeeId,
      status: 'active',
      startDate: { lte: periodEnd },
      OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
    },
    orderBy: { startDate: 'desc' },
    include: { salaryStructure: { include: { rules: { orderBy: { sequence: 'asc' } } } } },
  });
}
```

**File: `/lib/attendance.ts`**
```typescript
import { prisma } from './prisma';

export async function getWorkedDaysForPeriod(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const records = await prisma.attendance.findMany({
    where: {
      employeeId,
      checkIn: { gte: periodStart, lte: periodEnd },
      workedHours: { not: null },
    },
    select: { workedHours: true },
  });
  if (records.length === 0) return 30; // documented fallback — remove when attendance data exists
  // Count distinct calendar days with at least 4 worked hours as a "day"
  return records.filter(r => (r.workedHours ?? 0) >= 4).length || records.length;
}
```

**File: `/lib/audit.ts`**
```typescript
import { prisma } from './prisma';

export type AuditAction =
  | 'LOGIN' | 'CREATE_EMPLOYEE' | 'UPDATE_EMPLOYEE' | 'DELETE_EMPLOYEE'
  | 'CREATE_CONTRACT' | 'UPDATE_CONTRACT' | 'DELETE_CONTRACT'
  | 'APPROVE_TIMEOFF' | 'REFUSE_TIMEOFF' | 'CREATE_TIMEOFF_REQUEST'
  | 'COMPUTE_PAYRUN' | 'VALIDATE_PAYRUN' | 'MARK_PAID' | 'SEND_PAYSLIPS'
  | 'CREATE_PAYRUN' | 'UPDATE_SALARY_RULE' | 'CREATE_SALARY_RULE';

export async function writeAuditLog(params: {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details ? JSON.stringify(params.details) : null,
    },
  });
}
```

**File: `/lib/errorLog.ts`**
```typescript
import { prisma } from './prisma';

export async function writeErrorLog(params: {
  route: string;
  userId?: string;
  message: string;
  stack?: string;
}) {
  console.error(`[ERROR] ${params.route}`, params.message, params.stack ?? '');
  try {
    await prisma.errorLog.create({ data: params });
  } catch {
    // never let error logging crash the app
    console.error('[ERROR LOG WRITE FAILED]', params);
  }
}
```

**Acceptance criteria:** All 5 files exist, TypeScript compiles with no errors, `prisma generate` succeeds.

---

## Task 2: Prisma Schema + Migration + Seed

**What to build:** Write `schema.prisma` exactly as defined in MASTER_BUILD_SPEC.md, adding the AuditLog and ErrorLog models below. Run migrations. Write the seed.

**Additional models to add to schema.prisma (append after the models in MASTER_BUILD_SPEC.md):**

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  action     String
  entityType String
  entityId   String
  details    String?  // JSON string
  createdAt  DateTime @default(now())
  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
}

model ErrorLog {
  id        String   @id @default(cuid())
  route     String
  userId    String?
  message   String
  stack     String?  @db.Text
  createdAt DateTime @default(now())
  @@index([createdAt])
}
```

**Seed script requirements (`/prisma/seed.ts`):**

The seed must produce ALL of the following — use loops, not hand-typed records:

1. **Users + Employees:**
   - 1 Admin user (email: `admin@peoplepay360.com`, password: `Admin@123` bcrypt-hashed)
   - 2 HR Manager users
   - 1 HR Payroll Manager user
   - 1 HR Payroll User
   - 50 Employee users (looped: `emp1@peoplepay360.com` through `emp50@peoplepay360.com`, password: `Emp@123` bcrypt-hashed)
   - Each employee user must have a linked Employee record

2. **Working Schedules (3 total):**
   - "Standard 9-5" (Mon-Fri, 09:00-17:00, 60min break)
   - "Flexible 8-4" (Mon-Fri, 08:00-16:00, 45min break)
   - "Shift A" (Mon-Sat, 07:00-15:00, 30min break)

3. **Salary Structures (2 total) with Rules:**

   Structure 1: "Regular Salary"
   ```
   Seq 1 — BASIC, category: Basic, method: fixed, amount: CONTRACT_WAGE (use formula: "CONTRACT_WAGE")
   Seq 2 — HRA, category: Allowance, method: percentage, percentageOf: BASIC, percentageValue: 20
   Seq 3 — TA, category: Allowance, method: fixed, amount: 1500
   Seq 4 — GROSS, category: Gross, method: formula, formula: "BASIC + HRA + TA"
   Seq 5 — PF, category: Deduction, method: percentage, percentageOf: BASIC, percentageValue: 12
   Seq 6 — TAX, category: Deduction, method: formula, formula: "GROSS > 50000 ? GROSS * 0.1 : 0"
   Seq 7 — NET, category: Net, method: formula, formula: "GROSS - PF - TAX"
   ```

   Structure 2: "Contract Staff Salary"
   ```
   Seq 1 — BASIC, category: Basic, method: formula, formula: "CONTRACT_WAGE * WORKED_DAYS / 30"
   Seq 2 — BONUS, category: Allowance, method: fixed, amount: 2000
   Seq 3 — GROSS, category: Gross, method: formula, formula: "BASIC + BONUS"
   Seq 4 — PF, category: Deduction, method: percentage, percentageOf: GROSS, percentageValue: 8
   Seq 5 — NET, category: Net, method: formula, formula: "GROSS - PF"
   ```

4. **Contracts:** Each of 50 employees gets 2 contracts:
   - Contract 1: `status: 'expired'`, endDate 6 months ago, wage between 25000-60000
   - Contract 2: `status: 'active'`, startDate 5 months ago, endDate null, wage 5-15% higher than Contract 1
   - At least employees 1-5 use Structure 1, employees 6-10 use Structure 2 (vary the rest)

5. **Time Off Types (3):**
   - "Annual Leave" (days, requiresAllocation: true, payrollIntegrated: false)
   - "Sick Leave" (days, requiresAllocation: true, payrollIntegrated: false)
   - "Unpaid Leave" (days, requiresAllocation: false, payrollIntegrated: true)

6. **Allocations:** Every employee gets Annual Leave (20 days) and Sick Leave (10 days) allocations, all approved, valid for the current year. Seed `taken` values between 0-8 for variety.

7. **Attendance:** For each of 50 employees, generate 25-30 attendance records over the last 60 days. `checkIn` is a DateTime, `checkOut` is checkIn + 8-9 hours, `workedHours` = (checkOut - checkIn) in hours. Roughly 2 records per employee should have `status: 'exception'`.

8. **Historical Payruns (2, fully computed):**
   - Payrun 1: name "July 2026 Payroll", period July 2026, status: 'paid', all 50 employees
   - Payrun 2: name "August 2026 Payroll", period August 2026, status: 'validated', all 50 employees
   - Each payrun must have Payslip records with PayslipLine rows for every rule, and `netSalary` set.
   - Compute these in the seed using the same `computeSalaryRules` logic (import it, or inline the computation).

**Acceptance criteria:** `npx prisma db seed` completes with no errors. Database contains all described records. `prisma studio` shows 50 employees, contracts with at least one expired + one active per employee, 2 historical payruns with payslips.

---

## Task 3: Auth Login Route

**File: `/app/api/auth/login/route.ts`**

```typescript
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: { select: { id: true } } },
    });
    if (!user) return Response.json({ error: 'Invalid credentials' }, { status: 401 });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return Response.json({ error: 'Invalid credentials' }, { status: 401 });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, employeeId: user.employee?.id },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    );

    await writeAuditLog({ userId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id });

    return Response.json({ token, role: user.role, employeeId: user.employee?.id });
  } catch (err) {
    return handleApiError(err);
  }
}
```

**Acceptance criteria:** POST with valid credentials returns `{ token, role, employeeId }`. POST with wrong password returns 401.

---

## Task 4: Employee CRUD

**Roles allowed:**
- GET (list/detail): HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN; EMPLOYEE can only GET their own
- POST/PATCH/DELETE: HR_MANAGER, HR_PAYROLL_MANAGER, ADMIN

**File: `/app/api/employees/route.ts`**

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, requireRole, handleApiError } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  jobPosition: z.string().min(1),
  scheduleId: z.string().optional(),
  managerId: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    // EMPLOYEE role can only see themselves
    if (session.role === 'EMPLOYEE') {
      const emp = await prisma.employee.findFirst({
        where: { userId: session.userId },
        include: {
          schedule: true,
          _count: { select: { contracts: true, attendances: true, timeOffRequests: true } },
        },
      });
      return Response.json(emp ? [emp] : []);
    }
    requireRole(session, ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']);

    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department');

    const employees = await prisma.employee.findMany({
      where: department ? { department } : undefined,
      include: {
        schedule: true,
        _count: { select: { contracts: true, attendances: true, timeOffRequests: true, allocations: true } },
      },
      orderBy: { name: 'asc' },
    });
    return Response.json(employees);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    requireRole(session, ['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']);
    const body = createSchema.parse(await req.json());
    const employee = await prisma.employee.create({ data: body });
    await writeAuditLog({ userId: session.userId, action: 'CREATE_EMPLOYEE', entityType: 'Employee', entityId: employee.id });
    return Response.json(employee, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
```

**File: `/app/api/employees/[id]/route.ts`** — GET (own check for EMPLOYEE role), PATCH, DELETE with same role guards. Pattern is identical to above but with `prisma.employee.update/delete`. Always call `writeAuditLog` on PATCH and DELETE.

**Acceptance criteria:** EMPLOYEE role calling `GET /api/employees` gets only their own record. HR_MANAGER gets all. POST with missing `name` returns 400 validation error. DELETE by EMPLOYEE role returns 403.

---

## Task 5: Contract CRUD

**Roles:** HR_MANAGER, HR_PAYROLL_MANAGER, ADMIN for all operations. HR_PAYROLL_USER: read only.

**Critical business rule:** Creating an `active` contract for an employee who already has an `active` contract must be rejected with 409 and message `"Employee already has an active contract. Expire the existing one first."`. Check this in the POST handler before creating.

```typescript
// overlap check — add this before prisma.contract.create in POST
if (body.status === 'active') {
  const existing = await prisma.contract.findFirst({
    where: { employeeId: body.employeeId, status: 'active' },
  });
  if (existing) {
    return Response.json(
      { error: 'Employee already has an active contract. Expire the existing one first.' },
      { status: 409 }
    );
  }
}
```

**GET `/api/contracts`** must support `?employeeId=` filter. Include the salary structure name in the response (`include: { salaryStructure: { select: { id: true, name: true } } }`).

**Acceptance criteria:** 409 on overlapping active contract creation. GET with `?employeeId=X` returns only that employee's contracts. Expired contract's `status` correctly reflects 'expired'.

---

## Task 6: Working Schedule CRUD

**Roles:** HR_MANAGER, HR_PAYROLL_MANAGER, ADMIN for CUD. All authenticated roles: read.

**GET response must include `weeklyHours` computed server-side:**
```typescript
// After fetching schedule with its lines:
const weeklyHours = schedule.lines.reduce((sum, line) => {
  const [sh, sm] = line.startTime.split(':').map(Number);
  const [eh, em] = line.endTime.split(':').map(Number);
  const totalMins = (eh * 60 + em) - (sh * 60 + sm) - line.breakMins;
  return sum + totalMins / 60;
}, 0);
return Response.json({ ...schedule, weeklyHours: Math.round(weeklyHours * 10) / 10 });
```

Frontend must NOT recompute this — it reads the `weeklyHours` field from the response.

**Acceptance criteria:** GET /api/schedules/:id returns a `weeklyHours` field matching the sum of (endTime - startTime - breakMins) for all lines.

---

## Task 7: Attendance CRUD

**Roles:** EMPLOYEE can POST their own check-in, GET their own records. HR_MANAGER and above: full access.

**`workedHours` is computed on save:**
```typescript
const workedHours = checkOut
  ? (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000
  : null;
```

**GET must support filters:** `?employeeId=`, `?from=`, `?to=`, `?status=`.

**EMPLOYEE role ownership check:** If `session.role === 'EMPLOYEE'`, enforce `employeeId === session.employeeId` on all reads and the POST.

**Acceptance criteria:** Creating attendance with checkIn + checkOut stores correct `workedHours`. EMPLOYEE calling GET for another employee's attendance returns 403.

---

## Task 8: Time Off — Types, Allocations, Requests

**TimeOffType routes** (`/api/timeoff/types`): HR_MANAGER + above for CUD; all authenticated for read.

**Allocation routes** (`/api/timeoff/allocations`):
- POST/PATCH: HR_MANAGER + above
- GET: EMPLOYEE sees only their own (`?employeeId=session.employeeId`), others see all or filtered
- Response must include `remaining: allocation.allocated - allocation.taken` (computed, never stored)

**Request routes** (`/api/timeoff/requests`):
- EMPLOYEE can POST (their own only) and GET (their own only)
- HR_MANAGER + above can GET all, approve, refuse

**`PATCH /api/timeoff/requests/[id]/approve`:**
```typescript
// Must run inside prisma.$transaction to be atomic
await prisma.$transaction(async (tx) => {
  const request = await tx.timeOffRequest.findUnique({ where: { id } });
  if (!request) throw new ApiError(404, 'Request not found');
  if (request.status !== 'pending') throw new ApiError(400, 'Request is not pending');

  // Only check allocation if the type requires it
  const type = await tx.timeOffType.findUnique({ where: { id: request.typeId } });
  if (type?.requiresAllocation) {
    const allocation = await tx.allocation.findFirst({
      where: {
        employeeId: request.employeeId,
        typeId: request.typeId,
        approved: true,
        validFrom: { lte: request.startDate },
        validTo: { gte: request.endDate },
      },
    });
    if (!allocation) throw new ApiError(400, 'No approved allocation found for this period');
    const remaining = allocation.allocated - allocation.taken;
    if (request.duration > remaining) {
      throw new ApiError(400, `Insufficient balance. Requested ${request.duration}, remaining ${remaining}`);
    }
    await tx.allocation.update({
      where: { id: allocation.id },
      data: { taken: { increment: request.duration } },
    });
  }

  await tx.timeOffRequest.update({ where: { id }, data: { status: 'approved' } });
});
await writeAuditLog({ userId: session.userId, action: 'APPROVE_TIMEOFF', entityType: 'TimeOffRequest', entityId: id });
return Response.json({ success: true });
```

**`PATCH /api/timeoff/requests/[id]/refuse`:** Simply set `status: 'refused'`. No allocation change.

**Acceptance criteria:** Approving a request when `remaining < request.duration` returns 400. Approving a valid request increments `allocation.taken` exactly by `request.duration`. Refusing does not change `taken`.

---

## Task 9: Audit Log + Error Log Read Routes

**`GET /api/audit-log`** — ADMIN and HR_PAYROLL_MANAGER only. Supports `?userId=`, `?entityType=`, `?from=`, `?to=` filters. Returns 50 most recent by default, paginated via `?page=` and `?limit=`.

**`GET /api/error-log`** — ADMIN only. Same filter/pagination pattern.

---

## Tests You Must Write (do not skip)

Create files in `/__tests__/person-a/`. Install Jest + ts-jest if not already present: `npm i -D jest ts-jest @types/jest`.

**1. `contracts.test.ts`** — Unit tests for `getActiveContractForPeriod`:
- Employee has one expired contract (endDate 3 months ago) + one active (startDate 2 months ago, endDate null) → returns the active one for a current-period query.
- Employee has only an expired contract → returns null for a current-period query.
- Employee has two active contracts for different non-overlapping periods → returns only the one whose period covers the query range.

**2. `contract-overlap.test.ts`** — Integration tests:
- POST `/api/contracts` with `status: 'active'` when employee already has an active contract → 409 with message "already has an active contract".
- POST `/api/contracts` with `status: 'expired'` for same employee → 201 (expired contracts are never blocked).
- POST `/api/contracts` by an HR_PAYROLL_USER role → 403 (read-only role cannot create contracts).

**3. `timeoff-approve.test.ts`** — Integration tests:
- Approving when `request.duration > allocation.remaining` → 400 with "Insufficient balance" in message.
- Approving a valid request → allocation.taken incremented by exactly request.duration.
- Approving an already-approved (non-pending) request → 400.
- HR_PAYROLL_USER role calling PATCH approve → 403 (not allowed to approve time off).
- EMPLOYEE role calling PATCH approve for another employee's request → 403.

**4. `schedule-hours.test.ts`** — Unit test:
- ScheduleLines Mon-Fri 09:00-17:00 with 60min break each → `weeklyHours` = 35.0.
- ScheduleLines Mon-Sat 08:00-16:00 with 30min break each → `weeklyHours` = 45.0.

**5. `security.test.ts`** — Security integration tests (these are NOT optional — run the full suite before Hour 14):

```typescript
// /__tests__/person-a/security.test.ts
// Tests every RBAC boundary enforced by Person A's routes.
// Uses real HTTP calls against the running dev server or a test DB.

describe('EMPLOYEE role restrictions', () => {
  // Setup: create two employee users — empA (requester) and empB (target)
  // empA's JWT is used for all requests in this block

  test('GET /api/employees returns only own record (not all 50)', async () => {
    const res = await apiFetch('/api/employees', { token: empAToken });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].userId).toBe(empAUserId);
  });

  test('GET /api/employees/:id for another employee returns 403', async () => {
    const res = await apiFetch(`/api/employees/${empBId}`, { token: empAToken });
    expect(res.status).toBe(403);
  });

  test('GET /api/attendance?employeeId=[empB] returns 403', async () => {
    const res = await apiFetch(`/api/attendance?employeeId=${empBId}`, { token: empAToken });
    expect(res.status).toBe(403);
  });

  test('GET /api/contracts returns 403 (EMPLOYEE cannot list contracts)', async () => {
    const res = await apiFetch('/api/contracts', { token: empAToken });
    expect(res.status).toBe(403);
  });

  test('POST /api/employees returns 403', async () => {
    const res = await apiFetch('/api/employees', { method: 'POST', token: empAToken, body: { name: 'X' } });
    expect(res.status).toBe(403);
  });

  test('GET /api/salary-structures returns 403', async () => {
    const res = await apiFetch('/api/salary-structures', { token: empAToken });
    expect(res.status).toBe(403);
  });

  test('GET /api/salary-rules returns 403', async () => {
    const res = await apiFetch('/api/salary-rules', { token: empAToken });
    expect(res.status).toBe(403);
  });
});

describe('HR_MANAGER role restrictions', () => {
  // hrManagerToken = JWT for an HR_MANAGER user

  test('POST /api/payruns returns 403', async () => {
    const res = await apiFetch('/api/payruns', { method: 'POST', token: hrManagerToken, body: {} });
    expect(res.status).toBe(403);
  });

  test('POST /api/salary-rules returns 403', async () => {
    const res = await apiFetch('/api/salary-rules', { method: 'POST', token: hrManagerToken, body: {} });
    expect(res.status).toBe(403);
  });

  test('POST /api/salary-structures returns 403', async () => {
    const res = await apiFetch('/api/salary-structures', { method: 'POST', token: hrManagerToken, body: {} });
    expect(res.status).toBe(403);
  });
});

describe('HR_PAYROLL_USER role restrictions', () => {
  // payrollUserToken = JWT for HR_PAYROLL_USER

  test('DELETE /api/employees/:id returns 403', async () => {
    const res = await apiFetch(`/api/employees/${anyEmpId}`, { method: 'DELETE', token: payrollUserToken });
    expect(res.status).toBe(403);
  });

  test('POST /api/salary-rules returns 403 (read-only for payroll user)', async () => {
    const res = await apiFetch('/api/salary-rules', { method: 'POST', token: payrollUserToken, body: {} });
    expect(res.status).toBe(403);
  });
});

describe('No token / expired token', () => {
  test('GET /api/employees with no token returns 401', async () => {
    const res = await apiFetch('/api/employees', {});
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/login with wrong password returns 401', async () => {
    const res = await apiFetch('/api/auth/login', { method: 'POST', body: { email: 'admin@peoplepay360.com', password: 'wrong' } });
    expect(res.status).toBe(401);
  });

  test('GET /api/payslips with expired/malformed token returns 401', async () => {
    const res = await apiFetch('/api/payslips', { token: 'not.a.real.jwt' });
    expect(res.status).toBe(401);
  });
});

describe('Input validation (SQL injection / malformed body)', () => {
  test('POST /api/employees with SQL injection in name field is sanitized (Prisma parameterizes)', async () => {
    // Prisma uses parameterized queries — this test confirms no 500 crash
    const res = await apiFetch('/api/employees', {
      method: 'POST', token: adminToken,
      body: { name: "'; DROP TABLE employees; --", department: 'Test', jobPosition: 'Tester' }
    });
    // Should return 201 (the string is stored literally) or 400 — never 500
    expect([200, 201, 400]).toContain(res.status);
  });

  test('POST /api/contracts with missing required field returns 400', async () => {
    const res = await apiFetch('/api/contracts', { method: 'POST', token: adminToken, body: { wage: 30000 } });
    expect(res.status).toBe(400);
  });
});
```

---

## Contracts You Must Honor

- Export `getActiveContractForPeriod` from `/lib/contracts.ts` — Person B imports it
- Export `getWorkedDaysForPeriod` from `/lib/attendance.ts` — Person B imports it
- Export `writeAuditLog` from `/lib/audit.ts` — Person B and C import it
- Export `handleApiError`, `getSessionUser`, `requireRole`, `ApiError` from `/lib/auth.ts` — everyone imports it
- Do NOT change the Prisma schema after Hour 6 sync without informing the team first

## DO NOT

- Do not build any Payroll, SalaryStructure, SalaryRule, Payrun, or Payslip routes (those belong to Person B)
- Do not build any frontend/UI code (that belongs to Person C)
- Do not use `$queryRawUnsafe` or string concatenation in SQL
- Do not store `remaining` (Time Off balance) in the database — always derive it as `allocated - taken`
- Do not skip the seed historical Payruns — Person C's Dashboard needs them for real data
- Do not add packages not listed in Task 1's install command without updating MASTER_BUILD_SPEC.md

---

## EXPRESS MIGRATION ADDENDUM (v3 — read before building any route)

### New/changed files you own (in addition to everything above)

```
server/src/index.ts                     ← NEW — Express app, CORS, helmet, mounts every router
server/src/middleware/auth.ts           ← NEW — replaces getSessionUser/requireRole as middleware
server/src/middleware/errorHandler.ts   ← NEW — replaces handleApiError
server/src/lib/apiError.ts              ← MOVED from /lib/auth.ts — same class, own file now
server/src/lib/asyncHandler.ts          ← NEW — wraps every async route handler
server/src/lib/prisma.ts                ← same content as before, new path
server/src/lib/contracts.ts             ← same content as before, new path
server/src/lib/attendance.ts            ← same content as before, new path
server/src/lib/audit.ts                 ← same content as before, new path
server/src/lib/errorLog.ts              ← same content as before, new path
server/src/routes/auth.ts               ← was app/api/auth/login/route.ts
server/src/routes/employees.ts          ← was app/api/employees/[route.ts + [id]/route.ts] — ONE file, sub-routes via router.get('/:id', ...)
server/src/routes/contracts.ts          ← was app/api/contracts/*
server/src/routes/schedules.ts          ← was app/api/schedules/*
server/src/routes/attendance.ts         ← was app/api/attendance/*
server/src/routes/timeoff.ts            ← was app/api/timeoff/* (types, allocations, requests, approve, refuse — all sub-paths of one router)
server/src/routes/auditLog.ts           ← was app/api/audit-log/route.ts
server/src/routes/errorLog.ts           ← was app/api/error-log/route.ts
server/prisma/schema.prisma             ← same content, new path
server/prisma/seed.ts                   ← same content, new path
server/__tests__/person-a/*             ← same test files, now use supertest (see below)
```

Everything under Task 1 through Task 9 above (the shared libs, the schema, the seed, every route's business logic, every acceptance criterion) is **unchanged** — only the outer shape of each route file and where the role-check happens changes. Read Section 0 of `MASTER_BUILD_SPEC.md` for the full `requireAuth`/`requireRole`/`asyncHandler`/`errorHandler` code — it's reproduced in full there so it isn't duplicated across every build file. Copy those four files exactly as given.

### Route file conversion pattern (apply to every route in Tasks 3–9)

**Employee routes as a single Express router file** (`server/src/routes/employees.ts`), consolidating what used to be two Next.js files:

```typescript
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { writeAuditLog } from '../lib/audit';
import { ApiError } from '../lib/apiError';
import { z } from 'zod';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  jobPosition: z.string().min(1),
  scheduleId: z.string().optional(),
  managerId: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

// GET /api/employees
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const session = req.session!;
  if (session.role === 'EMPLOYEE') {
    const emp = await prisma.employee.findFirst({
      where: { userId: session.userId },
      include: { schedule: true, _count: { select: { contracts: true, attendances: true, timeOffRequests: true } } },
    });
    return res.json(emp ? [emp] : []);
  }
  if (!['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'].includes(session.role)) {
    throw new ApiError(403, 'Forbidden');
  }
  const department = req.query.department as string | undefined;
  const employees = await prisma.employee.findMany({
    where: department ? { department } : undefined,
    include: { schedule: true, _count: { select: { contracts: true, attendances: true, timeOffRequests: true, allocations: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(employees);
}));

// POST /api/employees
router.post('/', requireAuth, requireRole(['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']), asyncHandler(async (req, res) => {
  const session = req.session!;
  const body = createSchema.parse(req.body);
  const employee = await prisma.employee.create({ data: body });
  await writeAuditLog({ userId: session.userId, action: 'CREATE_EMPLOYEE', entityType: 'Employee', entityId: employee.id });
  res.status(201).json(employee);
}));

// GET /api/employees/:id
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const session = req.session!;
  const employee = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!employee) throw new ApiError(404, 'Not found');
  if (session.role === 'EMPLOYEE' && employee.userId !== session.userId) throw new ApiError(403, 'Forbidden');
  res.json(employee);
}));

// PATCH /api/employees/:id — same role guard as POST, then prisma.employee.update + writeAuditLog
// DELETE /api/employees/:id — same role guard as POST, then prisma.employee.delete + writeAuditLog

export default router;
```

Note the pattern for the `EMPLOYEE`-role "own record only" check: this stays as a manual `if` inside the handler (as shown), since `requireRole` middleware only knows the role, not which record is being requested — this mirrors exactly what the original Next.js version did, just moved from a bare function call to living inside an Express handler.

**Apply this same conversion mechanically to Contract, Schedule, Attendance, and Time Off routes** — one Express router file per resource, `router.get/post/patch/delete` for each verb, `requireAuth` + `requireRole([...])` in the route definition (or the manual ownership `if` where the original spec called for one, e.g. Attendance's EMPLOYEE-can-only-see-own-records check in Task 7, and the approve/refuse transaction logic in Task 8 — copy that logic verbatim into the Express handler body, it's unchanged).

**Time Off routes**: Types, Allocations, Requests, and the two action routes (`approve`, `refuse`) all become sub-paths of one `timeoff.ts` router:
```typescript
router.get('/types', ...); router.post('/types', ...); router.patch('/types/:id', ...); router.delete('/types/:id', ...);
router.get('/allocations', ...); router.post('/allocations', ...); router.patch('/allocations/:id', ...);
router.get('/requests', ...); router.post('/requests', ...); router.get('/requests/:id', ...);
router.patch('/requests/:id/approve', ...);   // the $transaction logic from Task 8, verbatim
router.patch('/requests/:id/refuse', ...);
```
Mounted in `index.ts` as `app.use('/api/timeoff', timeoffRoutes)`, so the full paths resolve exactly as before (`/api/timeoff/requests/:id/approve`, etc.) — no change to any path Person B or Person C consumes.

### Tests — rewritten for supertest against the real Express app (replaces every `apiFetch`-based test in Task's original test section)

Install `supertest` (already listed in Section 0e of `MASTER_BUILD_SPEC.md`). Export the configured `app` from `index.ts` *without* calling `.listen()` in a way that blocks test imports — split it like this:

```typescript
// server/src/app.ts — the Express app, exported for tests, no .listen() call here
export function createApp() { /* ... same helmet/cors/json/routes/errorHandler setup ... */ return app; }

// server/src/index.ts — the actual process entrypoint
import { createApp } from './app';
const app = createApp();
app.listen(process.env.PORT ?? 4000, () => console.log('listening'));
```

Then every security test becomes:

```typescript
// server/__tests__/person-a/security.test.ts
import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('EMPLOYEE role restrictions', () => {
  test('GET /api/employees returns only own record (not all 50)', async () => {
    const res = await request(app).get('/api/employees').set('Authorization', `Bearer ${empAToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].userId).toBe(empAUserId);
  });

  test('GET /api/employees/:id for another employee returns 403', async () => {
    const res = await request(app).get(`/api/employees/${empBId}`).set('Authorization', `Bearer ${empAToken}`);
    expect(res.status).toBe(403);
  });

  test('GET /api/attendance?employeeId=[empB] returns 403', async () => {
    const res = await request(app).get(`/api/attendance?employeeId=${empBId}`).set('Authorization', `Bearer ${empAToken}`);
    expect(res.status).toBe(403);
  });

  test('GET /api/contracts returns 403 (EMPLOYEE cannot list contracts)', async () => {
    const res = await request(app).get('/api/contracts').set('Authorization', `Bearer ${empAToken}`);
    expect(res.status).toBe(403);
  });

  test('POST /api/employees returns 403', async () => {
    const res = await request(app).post('/api/employees').set('Authorization', `Bearer ${empAToken}`).send({ name: 'X' });
    expect(res.status).toBe(403);
  });
});

describe('No token / expired token', () => {
  test('GET /api/employees with no token returns 401', async () => {
    const res = await request(app).get('/api/employees');
    expect(res.status).toBe(401);
  });

  test('GET /api/employees with malformed token returns 401', async () => {
    const res = await request(app).get('/api/employees').set('Authorization', 'Bearer not.a.real.jwt');
    expect(res.status).toBe(401);
  });
});

describe('CORS — same-origin enforcement (new in v3)', () => {
  test('OPTIONS preflight from an unlisted origin does not receive Access-Control-Allow-Origin', async () => {
    const res = await request(app).options('/api/employees').set('Origin', 'http://evil.example.com');
    expect(res.headers['access-control-allow-origin']).not.toBe('http://evil.example.com');
  });

  test('OPTIONS preflight from WEB_ORIGIN receives the correct Access-Control-Allow-Origin', async () => {
    const res = await request(app).options('/api/employees').set('Origin', process.env.WEB_ORIGIN!);
    expect(res.headers['access-control-allow-origin']).toBe(process.env.WEB_ORIGIN);
  });
});

describe('Security headers (helmet) — new in v3', () => {
  test('Response does not leak X-Powered-By: Express', async () => {
    const res = await request(app).get('/api/employees').set('Authorization', `Bearer ${adminToken}`);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
```

Apply the same `supertest(createApp())` conversion to every other test block in the original Task-9 test section (`HR_MANAGER role restrictions`, `HR_PAYROLL_USER role restrictions`, `Input validation`) — same assertions, same expected status codes, just `request(app).method(path).set(...).send(...)` instead of the old `apiFetch(...)` helper.

### Additional acceptance criteria (v3)

- `createApp()` can be imported and instantiated in a test file without opening a real port or requiring Redis/a live DB connection beyond what Prisma already needs.
- `errorHandler` is the last middleware registered — verify by triggering an uncaught error in a test route and confirming a `500` with the expected JSON shape, not an unhandled promise rejection or a hung request.
- CORS: a request with `Origin: http://evil.example.com` never receives a matching `Access-Control-Allow-Origin` header.
