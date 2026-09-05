# BUILD_PERSON_B.md — Person B (Payroll Engine)
> ⚠️ AGENT INSTRUCTIONS: You are building ONLY the items in this file. Nothing else. Build exactly as specified. If anything is unclear, output `// UNCLEAR: [question]` and stop. Do not proceed past unclear points.

> ⚠️ **ARCHITECTURE CHANGE — READ THIS FIRST:** Backend routes now run as **Express** (`server/`), not Next.js API routes — Next.js (`web/`) is frontend-only. `computeSalaryRules`, PDF/Excel generation, and the BullMQ worker are **completely unchanged** — this only affects the outer shape of your route files (Salary Structure/Rule CRUD, Payrun lifecycle, Payslip routes) and where role-checking happens. Read **"Express Migration Addendum"** at the end of this file, and Section 0 of `MASTER_BUILD_SPEC.md` for the shared middleware you import (`requireAuth`, `requireRole`, `asyncHandler`, `ApiError`) — Person A owns and provides those, do not reimplement them.

---

## Your Scope

You own **the payroll engine** — the part judges are actually testing for. This is the winning factor of the whole project. Your deliverables are:

- Salary Structure CRUD
- Salary Rule CRUD
- The `computeSalaryRules` rule engine (mathjs-based)
- Payrun lifecycle (create, add employees, compute, validate, mark-paid)
- Payslip read routes
- BullMQ queue for bulk "Send Payslips" (scoped to this one job only)
- Payslip PDF generation (synchronous, @react-pdf/renderer)
- Excel export of payslip data (exceljs)

**You depend on Person A for:**
- `getActiveContractForPeriod` from `/lib/contracts.ts` — do not reimplement this
- `getWorkedDaysForPeriod` from `/lib/attendance.ts` — do not reimplement this
- `writeAuditLog` from `/lib/audit.ts` — call this for all write actions
- `writeErrorLog` from `/lib/errorLog.ts` — call this in catch blocks
- The Prisma schema (you do not own migrations — ask Person A if you need a schema change)

---

## Your Files (exact paths — do not rename)

```
/lib/payroll/computeRules.ts            ← the rule engine (build and test this first)
/lib/payroll/generatePdf.ts             ← PDF generation helper
/lib/payroll/queue.ts                   ← BullMQ setup (Redis connection + queue definition)
/lib/payroll/workers/sendPayslips.ts    ← BullMQ worker for bulk send job
/app/api/salary-structures/route.ts
/app/api/salary-structures/[id]/route.ts
/app/api/salary-rules/route.ts
/app/api/salary-rules/[id]/route.ts
/app/api/payruns/route.ts               ← GET list, POST create (Step 1)
/app/api/payruns/[id]/route.ts          ← GET single payrun with payslips
/app/api/payruns/[id]/eligible-employees/route.ts
/app/api/payruns/[id]/employees/route.ts  ← POST: attach selected employees (Step 2)
/app/api/payruns/[id]/compute/route.ts
/app/api/payruns/[id]/validate/route.ts
/app/api/payruns/[id]/mark-paid/route.ts
/app/api/payruns/[id]/send-payslips/route.ts  ← enqueues BullMQ job
/app/api/payslips/route.ts              ← GET list
/app/api/payslips/[id]/route.ts         ← GET single payslip with lines
/app/api/payslips/[id]/pdf/route.ts     ← GET: generate and return PDF bytes
/app/api/payslips/export-excel/route.ts ← GET: export payslips as xlsx for a payrun
/__tests__/person-b/                    ← all your tests go here
```

---

## Task 1: The Rule Engine — Build and Test This First

**File: `/lib/payroll/computeRules.ts`**

```typescript
import { evaluate } from 'mathjs';

export interface RuleInput {
  code: string;
  name: string;
  category: string;
  sequence: number;
  computationMethod: 'fixed' | 'percentage' | 'formula';
  amount?: number | null;
  percentageOf?: string | null;
  percentageValue?: number | null;
  formula?: string | null;
}

export interface ComputeResult {
  lines: Array<{ code: string; name: string; category: string; amount: number }>;
  scope: Record<string, number>;
  warnings: string[];
}

export function computeSalaryRules(
  rules: RuleInput[],
  baseContext: Record<string, number> = {}
): ComputeResult {
  const sorted = [...rules].sort((a, b) => a.sequence - b.sequence);
  const scope: Record<string, number> = { ...baseContext };
  const lines: ComputeResult['lines'] = [];
  const warnings: string[] = [];

  for (const rule of sorted) {
    let value = 0;
    try {
      if (rule.computationMethod === 'fixed') {
        value = rule.amount ?? 0;
      } else if (rule.computationMethod === 'percentage') {
        const base = scope[rule.percentageOf ?? ''] ?? 0;
        if (rule.percentageOf && scope[rule.percentageOf] === undefined) {
          warnings.push(`Rule ${rule.code}: percentageOf "${rule.percentageOf}" not yet computed — value will be 0`);
        }
        value = base * ((rule.percentageValue ?? 0) / 100);
      } else if (rule.computationMethod === 'formula') {
        value = Number(evaluate(rule.formula ?? '0', { ...scope }));
        if (!isFinite(value)) {
          warnings.push(`Rule ${rule.code}: formula produced non-finite value, defaulting to 0`);
          value = 0;
        }
      }
    } catch (e) {
      warnings.push(`Rule ${rule.code}: formula error — ${(e as Error).message} — defaulting to 0`);
      value = 0;
    }
    scope[rule.code] = value;
    lines.push({ code: rule.code, name: rule.name, category: rule.category, amount: value });
  }

  return { lines, scope, warnings };
}
```

**STOP after writing this file. Run the unit tests (Task 9, tests 1 and 2) before building any API route.** This is the instruction from the master spec — the engine must be verified standalone before wiring it in.

**Acceptance criteria:** Unit tests pass. computeSalaryRules with known inputs (BASIC=30000, HRA=20% of BASIC, GROSS=BASIC+HRA, PF=12% of BASIC, NET=GROSS-PF) returns exactly: HRA=6000, GROSS=36000, PF=3600, NET=32400. A malformed formula returns a warning and does not throw.

---

## Task 2: Salary Structure CRUD

**Roles:**
- GET (list/detail): HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN
- POST/PATCH/DELETE: HR_PAYROLL_MANAGER, ADMIN

**File: `/app/api/salary-structures/route.ts`**

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, requireRole, handleApiError } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';

const createSchema = z.object({ name: z.string().min(1) });

export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    requireRole(session, ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']);
    const structures = await prisma.salaryStructure.findMany({
      include: {
        _count: { select: { rules: true, contracts: true } },
        rules: { orderBy: { sequence: 'asc' } },
      },
    });
    return Response.json(structures);
  } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    requireRole(session, ['HR_PAYROLL_MANAGER', 'ADMIN']);
    const body = createSchema.parse(await req.json());
    const structure = await prisma.salaryStructure.create({ data: body });
    await writeAuditLog({ userId: session.userId, action: 'CREATE_SALARY_RULE', entityType: 'SalaryStructure', entityId: structure.id });
    return Response.json(structure, { status: 201 });
  } catch (err) { return handleApiError(err); }
}
```

---

## Task 3: Salary Rule CRUD

**Roles:** Same as Salary Structure (HR_PAYROLL_USER: read only; HR_PAYROLL_MANAGER + ADMIN: full).

**Zod schema for creation/update — must reject invalid combinations:**
```typescript
const ruleSchema = z.object({
  structureId: z.string(),
  name: z.string().min(1),
  code: z.string().min(1).regex(/^[A-Z_]+$/, 'Code must be uppercase letters and underscores only'),
  category: z.enum(['Basic', 'Allowance', 'Gross', 'Deduction', 'Net']),
  sequence: z.number().int().positive(),
  computationMethod: z.enum(['fixed', 'percentage', 'formula']),
  amount: z.number().optional().nullable(),
  percentageOf: z.string().optional().nullable(),
  percentageValue: z.number().min(0).max(100).optional().nullable(),
  formula: z.string().optional().nullable(),
}).refine(
  (d) => d.computationMethod !== 'formula' || (d.formula && d.formula.trim().length > 0),
  { message: 'formula is required when computationMethod is "formula"', path: ['formula'] }
).refine(
  (d) => d.computationMethod !== 'percentage' || (d.percentageOf && d.percentageValue !== null),
  { message: 'percentageOf and percentageValue are required when computationMethod is "percentage"', path: ['percentageOf'] }
).refine(
  (d) => d.computationMethod !== 'fixed' || d.amount !== null,
  { message: 'amount is required when computationMethod is "fixed"', path: ['amount'] }
);
```

**Important:** After PATCH (update), call `writeAuditLog` with action `'UPDATE_SALARY_RULE'`. This enables the audit trail the user asked for.

**Acceptance criteria:** POST with `computationMethod: 'formula'` and no `formula` field returns 400 with message. POST with valid data returns 201. HR_MANAGER calling POST returns 403.

---

## Task 4: Payrun — Create (Step 1) and List

**Roles:** HR_PAYROLL_USER can POST and GET. HR_PAYROLL_MANAGER and ADMIN: full. HR_MANAGER: no access (403).

**File: `/app/api/payruns/route.ts`**

```typescript
const createSchema = z.object({
  name: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  salaryStructureId: z.string(),
});

// POST creates the Payrun with status: 'draft', no payslips yet
// GET returns list with counts: { id, name, periodStart, periodEnd, status, _count: { payslips: true } }
```

**Acceptance criteria:** POST creates a Payrun with `status: 'draft'` and zero payslips. GET returns payruns with payslip count.

---

## Task 5: Payrun — Get Single (with Payslips)

**`GET /api/payruns/[id]`** must return exactly this shape (Person C depends on it):

```typescript
// Response shape — match this exactly
{
  id: string,
  name: string,
  periodStart: string,    // ISO date
  periodEnd: string,      // ISO date
  status: string,
  salaryStructure: { id: string, name: string },
  payslips: Array<{
    id: string,
    employee: { id: string, name: string, department: string },
    status: string,
    netSalary: number | null,
    warnings: string[],
  }>,
}
```

Use a single Prisma query with the right `include` — no N+1:
```typescript
const payrun = await prisma.payrun.findUnique({
  where: { id },
  include: {
    salaryStructure: { select: { id: true, name: true } },
    payslips: {
      include: { employee: { select: { id: true, name: true, department: true } } },
      orderBy: { employee: { name: 'asc' } },
    },
  },
});
```

---

## Task 6: Eligible Employees

**`GET /api/payruns/[id]/eligible-employees`** — Returns employees who have an active contract for the payrun's period. Person C's Wizard Step 2 calls this.

```typescript
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionUser(req);
    requireRole(session, ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']);

    const payrun = await prisma.payrun.findUnique({ where: { id: params.id } });
    if (!payrun) return Response.json({ error: 'Payrun not found' }, { status: 404 });

    const allEmployees = await prisma.employee.findMany({
      where: { status: 'active' },
      select: { id: true, name: true, department: true, bankAccountNumber: true },
    });

    // For each employee, check if they have an active contract for the payrun period
    // Use Promise.all — not a sequential loop
    const eligible = await Promise.all(
      allEmployees.map(async (emp) => {
        const contract = await getActiveContractForPeriod(
          emp.id,
          payrun.periodStart,
          payrun.periodEnd
        );
        return contract ? { ...emp, contractId: contract.id, wage: contract.wage } : null;
      })
    );

    return Response.json(eligible.filter(Boolean));
  } catch (err) { return handleApiError(err); }
}
```

---

## Task 7: Attach Employees (Step 2)

**`POST /api/payruns/[id]/employees`** — Creates draft Payslip stubs for the selected employee IDs.

```typescript
const bodySchema = z.object({ employeeIds: z.array(z.string()).min(1) });

// For each employeeId: find their active contract, create a Payslip with status: 'draft'
// Run inside prisma.$transaction for atomicity
// If payrun is not in 'draft' status, return 400
// If an employee already has a payslip in this payrun, skip (don't create a duplicate)
```

---

## Task 8: Compute Payrun

**`POST /api/payruns/[id]/compute`** — This is the central logic. Read the code below carefully.

```typescript
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSessionUser(req);
    requireRole(session, ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']);

    const payrun = await prisma.payrun.findUnique({
      where: { id: params.id },
      include: {
        salaryStructure: { include: { rules: { orderBy: { sequence: 'asc' } } } },
        payslips: { include: { employee: true } },
      },
    });
    if (!payrun) return Response.json({ error: 'Payrun not found' }, { status: 404 });
    if (payrun.status === 'paid') return Response.json({ error: 'Cannot recompute a paid payrun' }, { status: 400 });

    // Process each payslip
    const updates = await Promise.all(
      payrun.payslips.map(async (payslip) => {
        const warnings: string[] = [];

        // 1. Resolve period-correct contract
        const contract = await getActiveContractForPeriod(
          payslip.employeeId,
          payrun.periodStart,
          payrun.periodEnd
        );

        if (!contract) {
          warnings.push('no active contract for period — payslip skipped');
          await prisma.payslip.update({
            where: { id: payslip.id },
            data: { warnings, status: 'draft' },
          });
          return { skipped: true, employeeId: payslip.employeeId };
        }

        // 2. Build base context
        const workedDays = await getWorkedDaysForPeriod(
          payslip.employeeId,
          payrun.periodStart,
          payrun.periodEnd
        );

        const baseContext: Record<string, number> = {
          CONTRACT_WAGE: contract.wage,
          WORKED_DAYS: workedDays,
        };

        // 3. Run the rule engine
        const { lines, scope, warnings: ruleWarnings } = computeSalaryRules(
          contract.salaryStructure.rules,
          baseContext
        );
        warnings.push(...ruleWarnings);

        // 4. Check for missing bank details
        if (!payslip.employee.bankAccountNumber) {
          warnings.push('missing bank details — cannot process payment');
        }

        // 5. Get NET salary
        const netLine = lines.find((l) => l.category === 'Net');
        const netSalary = netLine?.amount ?? scope['NET'] ?? 0;

        // 6. Delete old lines and create new ones (allows recompute on draft payslips)
        await prisma.$transaction(async (tx) => {
          await tx.payslipLine.deleteMany({ where: { payslipId: payslip.id } });
          await tx.payslipLine.createMany({
            data: lines.map((l) => ({ ...l, payslipId: payslip.id })),
          });
          await tx.payslip.update({
            where: { id: payslip.id },
            data: {
              contractId: contract.id,
              workedDays,
              netSalary,
              warnings,
              status: 'computed',
            },
          });
        });

        return { skipped: false, employeeId: payslip.employeeId, netSalary };
      })
    );

    await prisma.payrun.update({ where: { id: params.id }, data: { status: 'computed' } });
    await writeAuditLog({ userId: session.userId, action: 'COMPUTE_PAYRUN', entityType: 'Payrun', entityId: params.id });

    return Response.json({
      computed: updates.filter((u) => !u.skipped).length,
      skipped: updates.filter((u) => u.skipped).length,
    });
  } catch (err) { return handleApiError(err); }
}
```

**Critical:** Step 6 deletes and recreates PayslipLines. This is what makes recomputing after a SalaryRule edit work. This IS the live-demo moment — do not change this pattern.

---

## Task 9: Validate, Mark Paid

**`POST /api/payruns/[id]/validate`:**
- Roles: HR_PAYROLL_MANAGER, ADMIN
- Block if payrun status is not 'computed' → 400
- Block if ANY payslip has a warning containing 'skipped' or 'missing bank details' → return 400 with the blocking warnings listed
- Otherwise: set all payslips to `status: 'validated'`, set payrun to `status: 'validated'`
- Call `writeAuditLog` with action `'VALIDATE_PAYRUN'`

**`POST /api/payruns/[id]/mark-paid`:**
- Roles: HR_PAYROLL_MANAGER, ADMIN
- Block if payrun status is not 'validated' → 400
- Set all payslips to `status: 'paid'`, set payrun to `status: 'paid'`
- Call `writeAuditLog` with action `'MARK_PAID'`

---

## Task 10: Payslip Read Routes

**`GET /api/payslips`** — supports `?payrunId=`, `?employeeId=`, `?status=` filters. EMPLOYEE role: filter to own employeeId only. Include employee name and payrun name.

**`GET /api/payslips/[id]`** — must return exactly this shape (Person C's payslip detail screen reads it):

```json
{
  "id": "...",
  "employee": { "id": "...", "name": "...", "department": "..." },
  "payrun": { "id": "...", "name": "...", "periodStart": "...", "periodEnd": "..." },
  "status": "computed",
  "workedDays": 28,
  "netSalary": 32400,
  "warnings": [],
  "lines": [
    { "code": "BASIC", "name": "Basic", "category": "Basic", "amount": 30000 },
    { "code": "HRA", "name": "HRA", "category": "Allowance", "amount": 6000 },
    { "code": "GROSS", "name": "Gross", "category": "Gross", "amount": 36000 },
    { "code": "PF", "name": "Provident Fund", "category": "Deduction", "amount": 3600 },
    { "code": "NET", "name": "Net Salary", "category": "Net", "amount": 32400 }
  ]
}
```

Single Prisma query — no N+1:
```typescript
const payslip = await prisma.payslip.findUnique({
  where: { id: params.id },
  include: {
    employee: { select: { id: true, name: true, department: true } },
    payrun: { select: { id: true, name: true, periodStart: true, periodEnd: true } },
    lines: { orderBy: { category: 'asc' } },
  },
});
```

---

## Task 11: PDF Generation

**File: `/lib/payroll/generatePdf.ts`**

Use `@react-pdf/renderer`. The PDF must contain:
- Header: "PAYSLIP" + company name "PeoplePay360"
- Employee name, department
- Payrun name, period (formatted as "July 2026")
- Worked days, status
- Table of PayslipLines grouped by category: Basic → Allowances → Gross → Deductions → Net
- Net salary highlighted in bold at bottom

```typescript
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subheader: { fontSize: 11, marginBottom: 20, color: '#555' },
  table: { display: 'flex', flexDirection: 'column', marginTop: 12 },
  row: { flexDirection: 'row', borderBottom: '1px solid #eee', paddingVertical: 4 },
  label: { flex: 2, color: '#444' },
  amount: { flex: 1, textAlign: 'right' },
  netRow: { flexDirection: 'row', paddingVertical: 6, marginTop: 4, borderTop: '2px solid #000' },
  netLabel: { flex: 2, fontWeight: 'bold', fontSize: 11 },
  netAmount: { flex: 1, textAlign: 'right', fontWeight: 'bold', fontSize: 11 },
  sectionHeader: { fontSize: 9, color: '#888', marginTop: 10, marginBottom: 2, textTransform: 'uppercase' },
});

export async function generatePayslipPdf(payslip: {
  employee: { name: string; department: string };
  payrun: { name: string; periodStart: string; periodEnd: string };
  workedDays: number;
  lines: Array<{ code: string; name: string; category: string; amount: number }>;
  netSalary: number | null;
}): Promise<Buffer> {
  const categories = ['Basic', 'Allowance', 'Gross', 'Deduction', 'Net'];
  const grouped = categories.map((cat) => ({
    category: cat,
    lines: payslip.lines.filter((l) => l.category === cat),
  })).filter((g) => g.lines.length > 0);

  const period = new Date(payslip.payrun.periodStart).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric',
  });

  const doc = React.createElement(Document, {},
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(View, {},
        React.createElement(Text, { style: styles.header }, 'PeoplePay360'),
        React.createElement(Text, { style: styles.subheader }, `Payslip — ${period}`),
        React.createElement(Text, {}, `Employee: ${payslip.employee.name}`),
        React.createElement(Text, {}, `Department: ${payslip.employee.department}`),
        React.createElement(Text, {}, `Pay Run: ${payslip.payrun.name}`),
        React.createElement(Text, {}, `Worked Days: ${payslip.workedDays}`),
      ),
      ...grouped.map((group) =>
        React.createElement(View, { key: group.category, style: styles.table },
          React.createElement(Text, { style: styles.sectionHeader }, group.category),
          ...group.lines
            .filter((l) => l.category !== 'Net')
            .map((line) =>
              React.createElement(View, { key: line.code, style: styles.row },
                React.createElement(Text, { style: styles.label }, line.name),
                React.createElement(Text, { style: styles.amount }, line.amount.toLocaleString('en-IN'))
              )
            )
        )
      ),
      React.createElement(View, { style: styles.netRow },
        React.createElement(Text, { style: styles.netLabel }, 'Net Salary'),
        React.createElement(Text, { style: styles.netAmount }, (payslip.netSalary ?? 0).toLocaleString('en-IN'))
      )
    )
  );

  return await renderToBuffer(doc);
}
```

**`GET /api/payslips/[id]/pdf`** — calls `generatePayslipPdf`, returns the buffer with headers:
```typescript
return new Response(pdfBuffer, {
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="payslip-${id}.pdf"`,
  },
});
```

---

## Task 12: Excel Export

**`GET /api/payslips/export-excel?payrunId=[id]`** — exports all payslips for a payrun to xlsx.

```typescript
import ExcelJS from 'exceljs';

// Fetch all payslips with lines for the payrun
// Create workbook with one sheet "Payslips"
// Columns: Employee Name | Department | Worked Days | [one column per rule code in sequence] | Net Salary | Status | Warnings
// Bold header row
// Auto-fit column widths (set width to max(header.length, maxValueLength) + 2)
// Return as buffer:
const buffer = await workbook.xlsx.writeBuffer();
return new Response(buffer, {
  headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="payrun-${payrunId}-payslips.xlsx"`,
  },
});
```

Roles allowed: HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN.

---

## Task 13: BullMQ — Bulk Send Payslips

**This is scoped to ONE job: bulk "Send Payslips". Nothing else uses the queue.**

**File: `/lib/payroll/queue.ts`**
```typescript
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
});

export const payslipSendQueue = new Queue('payslip-send', { connection: redisConnection });
```

**File: `/lib/payroll/workers/sendPayslips.ts`**
```typescript
import { Worker } from 'bullmq';
import { redisConnection } from '../queue';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { writeErrorLog } from '@/lib/errorLog';

// Job data shape: { payrunId: string, requestedByUserId: string }
export const sendPayslipsWorker = new Worker(
  'payslip-send',
  async (job) => {
    const { payrunId, requestedByUserId } = job.data;
    const payslips = await prisma.payslip.findMany({
      where: { payrunId, status: { in: ['validated', 'paid'] } },
      include: { employee: { include: { user: { select: { email: true } } } } },
    });
    let sent = 0;
    for (const payslip of payslips) {
      const email = payslip.employee.user?.email;
      if (!email) {
        await writeErrorLog({ route: 'sendPayslipsWorker', message: `No email for employee ${payslip.employeeId}`, userId: requestedByUserId });
        continue;
      }
      // Local-only: log the send action, mark as sent
      // Do NOT call any external email API (no Resend, no SMTP) — this is a local demo build
      console.log(`[PAYSLIP SEND] Would email payslip ${payslip.id} to ${email}`);
      await prisma.payslip.update({ where: { id: payslip.id }, data: { status: 'paid' } });
      sent++;
    }
    await writeAuditLog({
      userId: requestedByUserId,
      action: 'SEND_PAYSLIPS',
      entityType: 'Payrun',
      entityId: payrunId,
      details: { sent, total: payslips.length },
    });
    return { sent };
  },
  { connection: redisConnection }
);
```

**`POST /api/payruns/[id]/send-payslips`** — enqueues the job and returns immediately:
```typescript
await payslipSendQueue.add('send', { payrunId: params.id, requestedByUserId: session.userId });
return Response.json({ message: 'Payslip send job queued' });
```

Start the worker in a separate process or in Next.js instrumentation. Add to `.env`:
```
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Tests You Must Write (do not skip)

Create files in `/__tests__/person-b/`.

**1. `computeRules.unit.test.ts`** — Unit tests for `computeSalaryRules`:
- Given: BASIC (fixed, 30000), HRA (percentage of BASIC, 20%), GROSS (formula: BASIC+HRA), PF (percentage of BASIC, 12%), NET (formula: GROSS-PF)
- baseContext: `{ CONTRACT_WAGE: 30000, WORKED_DAYS: 30 }`
- Expected output: BASIC=30000, HRA=6000, GROSS=36000, PF=3600, NET=32400, warnings=[]
- Test 2: a rule with formula `"UNDEFINED_VAR * 2"` → result is 0, warnings contains the rule code, no throw

**2. `computeRules.formula.test.ts`** — Formula rule tests:
- Formula `"CONTRACT_WAGE * WORKED_DAYS / 30"` with CONTRACT_WAGE=36000, WORKED_DAYS=25 → 30000
- Formula `"GROSS > 50000 ? GROSS * 0.1 : 0"` with GROSS=60000 → 6000
- Formula `"GROSS > 50000 ? GROSS * 0.1 : 0"` with GROSS=40000 → 0

**3. `payruns.integration.test.ts`** — Integration tests:
- `POST /api/payruns/:id/compute` skips an employee with no active contract and records a warning containing 'no active contract', without failing the whole batch
- After changing a SalaryRule's `amount` and re-calling compute on a still-draft payslip, the returned `netSalary` differs from the previous value (this directly tests the live-demo requirement — MUST pass)
- `POST /api/salary-rules` with `computationMethod: 'formula'` and no `formula` field returns 400

**4. `pdf.test.ts`** — Basic smoke test:
- `generatePayslipPdf` with valid payslip data returns a non-empty Buffer
- Buffer starts with `%PDF` (first 4 bytes)

**5. `security.test.ts`** — Security integration tests for ALL payroll routes (do not skip any):

```typescript
// /__tests__/person-b/security.test.ts
// Every payroll/salary route must reject unauthorized roles at the API level,
// regardless of what the UI shows or hides.

describe('Salary Structure — role enforcement', () => {
  test('EMPLOYEE role: GET /api/salary-structures → 403', async () => {
    const res = await apiFetch('/api/salary-structures', { token: employeeToken });
    expect(res.status).toBe(403);
  });

  test('HR_MANAGER role: GET /api/salary-structures → 403', async () => {
    const res = await apiFetch('/api/salary-structures', { token: hrManagerToken });
    expect(res.status).toBe(403);
  });

  test('HR_PAYROLL_USER role: GET /api/salary-structures → 200 (read allowed)', async () => {
    const res = await apiFetch('/api/salary-structures', { token: payrollUserToken });
    expect(res.status).toBe(200);
  });

  test('HR_PAYROLL_USER role: POST /api/salary-structures → 403 (no write)', async () => {
    const res = await apiFetch('/api/salary-structures', { method: 'POST', token: payrollUserToken, body: { name: 'X' } });
    expect(res.status).toBe(403);
  });

  test('HR_MANAGER role: POST /api/salary-structures → 403', async () => {
    const res = await apiFetch('/api/salary-structures', { method: 'POST', token: hrManagerToken, body: { name: 'X' } });
    expect(res.status).toBe(403);
  });
});

describe('Salary Rule — role enforcement', () => {
  test('EMPLOYEE role: GET /api/salary-rules → 403', async () => {
    const res = await apiFetch('/api/salary-rules', { token: employeeToken });
    expect(res.status).toBe(403);
  });

  test('HR_MANAGER role: POST /api/salary-rules → 403', async () => {
    const res = await apiFetch('/api/salary-rules', { method: 'POST', token: hrManagerToken, body: {} });
    expect(res.status).toBe(403);
  });

  test('HR_PAYROLL_USER role: POST /api/salary-rules → 403 (read-only)', async () => {
    const res = await apiFetch('/api/salary-rules', { method: 'POST', token: payrollUserToken, body: {} });
    expect(res.status).toBe(403);
  });

  test('HR_PAYROLL_MANAGER role: POST /api/salary-rules with valid body → 201', async () => {
    const res = await apiFetch('/api/salary-rules', {
      method: 'POST', token: payrollManagerToken,
      body: { structureId, name: 'Test', code: 'TEST', category: 'Basic', sequence: 99, computationMethod: 'fixed', amount: 1000 }
    });
    expect(res.status).toBe(201);
  });
});

describe('Payrun — role enforcement', () => {
  test('EMPLOYEE role: GET /api/payruns → 403', async () => {
    const res = await apiFetch('/api/payruns', { token: employeeToken });
    expect(res.status).toBe(403);
  });

  test('HR_MANAGER role: POST /api/payruns → 403', async () => {
    const res = await apiFetch('/api/payruns', { method: 'POST', token: hrManagerToken, body: {} });
    expect(res.status).toBe(403);
  });

  test('HR_MANAGER role: POST /api/payruns/:id/compute → 403', async () => {
    const res = await apiFetch(`/api/payruns/${existingPayrunId}/compute`, { method: 'POST', token: hrManagerToken });
    expect(res.status).toBe(403);
  });

  test('HR_PAYROLL_USER role: POST /api/payruns/:id/validate → 403 (only MANAGER can validate)', async () => {
    const res = await apiFetch(`/api/payruns/${existingPayrunId}/validate`, { method: 'POST', token: payrollUserToken });
    expect(res.status).toBe(403);
  });

  test('HR_PAYROLL_USER role: POST /api/payruns/:id/mark-paid → 403', async () => {
    const res = await apiFetch(`/api/payruns/${existingPayrunId}/mark-paid`, { method: 'POST', token: payrollUserToken });
    expect(res.status).toBe(403);
  });
});

describe('Payslip — employee data isolation', () => {
  // empA and empB are two different employees
  // empAPayslipId belongs to empA only

  test('EMPLOYEE role: GET /api/payslips/:id for own payslip → 200', async () => {
    const res = await apiFetch(`/api/payslips/${empAPayslipId}`, { token: empAToken });
    expect(res.status).toBe(200);
  });

  test('EMPLOYEE role: GET /api/payslips/:id for another employee payslip → 403', async () => {
    const res = await apiFetch(`/api/payslips/${empAPayslipId}`, { token: empBToken });
    expect(res.status).toBe(403);
  });

  test('EMPLOYEE role: GET /api/payslips (list) returns only own payslips', async () => {
    const res = await apiFetch('/api/payslips', { token: empAToken });
    expect(res.status).toBe(200);
    const body = await res.json();
    body.forEach((p: { employeeId: string }) => expect(p.employeeId).toBe(empAEmployeeId));
  });

  test('EMPLOYEE role: GET /api/payslips/:id/pdf for another employee → 403', async () => {
    const res = await apiFetch(`/api/payslips/${empAPayslipId}/pdf`, { token: empBToken });
    expect(res.status).toBe(403);
  });
});

describe('Payrun lifecycle — status gate enforcement', () => {
  test('POST /api/payruns/:id/validate on a "draft" (not yet computed) payrun → 400', async () => {
    const res = await apiFetch(`/api/payruns/${draftPayrunId}/validate`, { method: 'POST', token: payrollManagerToken });
    expect(res.status).toBe(400);
  });

  test('POST /api/payruns/:id/mark-paid on a "computed" (not yet validated) payrun → 400', async () => {
    const res = await apiFetch(`/api/payruns/${computedPayrunId}/mark-paid`, { method: 'POST', token: payrollManagerToken });
    expect(res.status).toBe(400);
  });

  test('POST /api/payruns/:id/compute on a "paid" payrun → 400 (cannot recompute paid)', async () => {
    const res = await apiFetch(`/api/payruns/${paidPayrunId}/compute`, { method: 'POST', token: payrollManagerToken });
    expect(res.status).toBe(400);
  });
});

describe('Input validation', () => {
  test('POST /api/salary-rules with computationMethod=formula and no formula field → 400', async () => {
    const res = await apiFetch('/api/salary-rules', {
      method: 'POST', token: payrollManagerToken,
      body: { structureId, name: 'Bad Rule', code: 'BAD', category: 'Basic', sequence: 1, computationMethod: 'formula' }
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/formula/i);
  });

  test('POST /api/salary-rules with code containing lowercase → 400', async () => {
    const res = await apiFetch('/api/salary-rules', {
      method: 'POST', token: payrollManagerToken,
      body: { structureId, name: 'Bad', code: 'basic_salary', category: 'Basic', sequence: 1, computationMethod: 'fixed', amount: 1000 }
    });
    expect(res.status).toBe(400);
  });

  test('No auth token on any payroll route → 401', async () => {
    const routes = ['/api/salary-structures', '/api/salary-rules', '/api/payruns', '/api/payslips'];
    for (const route of routes) {
      const res = await apiFetch(route, {});
      expect(res.status).toBe(401);
    }
  });
});
```

---

## Contracts You Must Honor

- Import `getActiveContractForPeriod` from `/lib/contracts.ts` — do NOT re-implement
- Import `getWorkedDaysForPeriod` from `/lib/attendance.ts` — do NOT re-implement
- Import `writeAuditLog` from `/lib/audit.ts` — call it for every write action listed
- `GET /api/payruns/:id` response shape must match exactly what's in Task 5
- `GET /api/payslips/:id` response shape must match exactly what's in Task 10

## DO NOT

- Do not implement any Employee, Contract, Attendance, Working Schedule, or Time Off routes (those belong to Person A)
- Do not build any frontend/UI code (that belongs to Person C)
- Do not use Resend, SMTP, or any external email API — the worker logs to console only
- Do not use Cloudflare R2, S3, or any cloud storage — PDFs are returned directly as response bytes
- Do not add NestJS, Sentry, class-validator, Pino, or any package not already installed in Task 1 of Person A's build
- Do not implement WebSockets or Socket.IO — the frontend polls
- Do not implement optimistic locking (version column) — not in scope
- Do not skip the delete-and-recreate pattern in the compute route — it is required for recompute to work

---

## EXPRESS MIGRATION ADDENDUM (v3 — read before building any route)

### New/changed file paths (content mostly unchanged — see below)

```
server/src/lib/payroll/computeRules.ts       ← UNCHANGED CONTENT, new path (was /lib/payroll/computeRules.ts)
server/src/lib/payroll/generatePdf.ts        ← UNCHANGED CONTENT, new path
server/src/lib/payroll/queue.ts              ← UNCHANGED CONTENT, new path
server/src/lib/payroll/workers/sendPayslips.ts ← UNCHANGED CONTENT, new path
server/src/routes/salaryStructures.ts        ← was app/api/salary-structures/*
server/src/routes/salaryRules.ts             ← was app/api/salary-rules/*
server/src/routes/payruns.ts                 ← was app/api/payruns/* (create, eligible-employees, employees, compute, validate, mark-paid, send-payslips — ALL sub-routes of one router)
server/src/routes/payslips.ts                ← was app/api/payslips/* (list, detail, pdf, export-excel)
server/__tests__/person-b/*                  ← same test files, now use supertest (see below)
```

**Task 1 (the rule engine itself) needs zero changes.** `computeSalaryRules` has no knowledge of HTTP at all — it's a pure function taking rules + context, returning lines/scope/warnings. Build and unit-test it exactly as specified, in its new path, before touching any route — that instruction from the original file still stands unchanged.

### Route conversion pattern — Salary Rule CRUD as an Express router

```typescript
// server/src/routes/salaryRules.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { writeAuditLog } from '../lib/audit';
import { z } from 'zod';

const router = Router();

const ruleSchema = z.object({
  structureId: z.string(),
  name: z.string().min(1),
  code: z.string().min(1).regex(/^[A-Z_]+$/, 'Code must be uppercase letters and underscores only'),
  category: z.enum(['Basic', 'Allowance', 'Gross', 'Deduction', 'Net']),
  sequence: z.number().int().positive(),
  computationMethod: z.enum(['fixed', 'percentage', 'formula']),
  amount: z.number().optional().nullable(),
  percentageOf: z.string().optional().nullable(),
  percentageValue: z.number().min(0).max(100).optional().nullable(),
  formula: z.string().optional().nullable(),
}).refine((data) => data.computationMethod !== 'formula' || !!data.formula, {
  message: 'formula is required when computationMethod is "formula"',
  path: ['formula'],
});

router.get('/', requireAuth, requireRole(['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']), asyncHandler(async (req, res) => {
  const rules = await prisma.salaryRule.findMany({ orderBy: { sequence: 'asc' } });
  res.json(rules);
}));

router.post('/', requireAuth, requireRole(['HR_PAYROLL_MANAGER', 'ADMIN']), asyncHandler(async (req, res) => {
  const session = req.session!;
  const body = ruleSchema.parse(req.body);
  const rule = await prisma.salaryRule.create({ data: body });
  await writeAuditLog({ userId: session.userId, action: 'CREATE_SALARY_RULE', entityType: 'SalaryRule', entityId: rule.id });
  res.status(201).json(rule);
}));

// PATCH /:id, DELETE /:id — same requireRole(['HR_PAYROLL_MANAGER', 'ADMIN']) guard,
// same zod validation on PATCH, same writeAuditLog call — logic unchanged from the original spec

export default router;
```

Apply the same conversion to Salary Structures (Task 2), Payruns (Tasks 3–8: create, eligible-employees, employees, compute, validate, mark-paid, send-payslips — all as `router.get/post` sub-paths of one `payruns.ts` file, e.g. `router.post('/:id/compute', requireAuth, requireRole([...]), asyncHandler(...))`), and Payslips (list, detail, pdf, export-excel). **Every business rule stays exactly as specified in the original Tasks 2–10** — the delete-and-recreate compute pattern, the status-gate checks (`draft → computed → validated → paid`), the `bankAccountNumber` warning logic, the PDF generation call, the BullMQ enqueue in send-payslips — none of that changes. Only the outer `(req, res)` signature and the `requireAuth`/`requireRole(...)` middleware in the route definition (replacing the old inline `getSessionUser`/`requireRole` calls) change.

**PDF and Excel routes specifically** — these return binary data, which Express handles slightly differently than the old `Response.json`/raw bytes pattern:
```typescript
router.get('/:id/pdf', requireAuth, asyncHandler(async (req, res) => {
  const session = req.session!;
  const payslip = await prisma.payslip.findUnique({ where: { id: req.params.id }, include: { /* ... */ } });
  if (!payslip) throw new ApiError(404, 'Not found');
  if (session.role === 'EMPLOYEE' && payslip.employeeId !== session.employeeId) throw new ApiError(403, 'Forbidden');
  const pdfBuffer = await generatePayslipPdf(payslip);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="payslip-${payslip.id}.pdf"`);
  res.send(pdfBuffer);
}));
```
`res.send(buffer)` with the right headers replaces whatever raw-bytes `Response` construction the Next.js version used — same `generatePayslipPdf` function, same Buffer, just handed to Express's `res.send` instead.

### Tests — rewritten for supertest against the real Express app

Same pattern as Person A's addendum: import `createApp` from `server/src/app.ts` (Person A owns this file, exports the configured app without calling `.listen()`), and convert every `apiFetch`-based assertion in the original security test section to `supertest`:

```typescript
// server/__tests__/person-b/security.test.ts
import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Salary Structure — role enforcement', () => {
  test('EMPLOYEE role: GET /api/salary-structures → 403', async () => {
    const res = await request(app).get('/api/salary-structures').set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  test('HR_PAYROLL_USER role: GET /api/salary-structures → 200 (read allowed)', async () => {
    const res = await request(app).get('/api/salary-structures').set('Authorization', `Bearer ${payrollUserToken}`);
    expect(res.status).toBe(200);
  });

  test('HR_PAYROLL_USER role: POST /api/salary-structures → 403 (no write)', async () => {
    const res = await request(app).post('/api/salary-structures').set('Authorization', `Bearer ${payrollUserToken}`).send({ name: 'X' });
    expect(res.status).toBe(403);
  });
});

describe('Payslip — employee data isolation', () => {
  test('EMPLOYEE role: GET /api/payslips/:id for own payslip → 200', async () => {
    const res = await request(app).get(`/api/payslips/${empAPayslipId}`).set('Authorization', `Bearer ${empAToken}`);
    expect(res.status).toBe(200);
  });

  test('EMPLOYEE role: GET /api/payslips/:id for another employee payslip → 403', async () => {
    const res = await request(app).get(`/api/payslips/${empAPayslipId}`).set('Authorization', `Bearer ${empBToken}`);
    expect(res.status).toBe(403);
  });

  test('EMPLOYEE role: GET /api/payslips/:id/pdf for another employee → 403', async () => {
    const res = await request(app).get(`/api/payslips/${empAPayslipId}/pdf`).set('Authorization', `Bearer ${empBToken}`);
    expect(res.status).toBe(403);
  });
});

describe('Payrun lifecycle — status gate enforcement', () => {
  test('POST /api/payruns/:id/validate on a "draft" payrun → 400', async () => {
    const res = await request(app).post(`/api/payruns/${draftPayrunId}/validate`).set('Authorization', `Bearer ${payrollManagerToken}`);
    expect(res.status).toBe(400);
  });
});

describe('Input validation', () => {
  test('POST /api/salary-rules with computationMethod=formula and no formula field → 400', async () => {
    const res = await request(app).post('/api/salary-rules').set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({ structureId, name: 'Bad Rule', code: 'BAD', category: 'Basic', sequence: 1, computationMethod: 'formula' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/formula/i);
  });

  test('No auth token on any payroll route → 401', async () => {
    const routes = ['/api/salary-structures', '/api/salary-rules', '/api/payruns', '/api/payslips'];
    for (const route of routes) {
      const res = await request(app).get(route);
      expect(res.status).toBe(401);
    }
  });
});

describe('BullMQ worker failure handling — new in v3', () => {
  // Confirms the send-payslips route degrades gracefully when Redis is unreachable,
  // which matters more now that it's a genuinely separate network hop from an Express process
  // rather than colocated in the same Next.js server process.
  test('POST /api/payruns/:id/send-payslips returns 503 (not 500, not a hang) when Redis is unreachable', async () => {
    // Point REDIS_HOST at an invalid host for this test, or mock the queue's .add() to reject with ECONNREFUSED
    const res = await request(app).post(`/api/payruns/${validatedPayrunId}/send-payslips`).set('Authorization', `Bearer ${payrollManagerToken}`);
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/queue unavailable/i);
  });
});
```

Convert every remaining assertion in the original Task's security test section (Salary Rule role enforcement, Payrun role enforcement) the same way — same expected status codes, just `request(app)` instead of `apiFetch`.

### Additional acceptance criteria (v3)

- Every payroll route is reachable at the same path (`/api/salary-structures`, `/api/payruns/:id/compute`, etc.) whether hit via `supertest` in tests or via `apiFetch` from the real frontend — the Express router mount paths in `index.ts` must match exactly what Person C's `web/lib/api.ts` calls.
- PDF and Excel download routes return the correct `Content-Type` and `Content-Disposition` headers — verify with a test asserting `res.headers['content-type']` starts with `application/pdf` or the correct xlsx MIME type.
- The BullMQ send-payslips route returns `503` with `"Queue unavailable"` (not a hang, not a 500) when Redis is unreachable — this was already a requirement in `INTEGRATION.md`'s risk table, now specifically tested.
