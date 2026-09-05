# PeoplePay360 — MASTER BUILD SPEC (v3, Next.js + Express split)
### Give this file to your AI coding agent alongside BUILD_PERSON_A.md / B.md / C.md / INTEGRATION.md. This version adds: the complete file tree across all three people, exact Postgres setup commands, a consolidated security matrix, and the **Next.js (frontend) + Express (backend) architecture split**. Read fully before writing any code.

> ⚠️ **ARCHITECTURE CHANGE (v3):** All API routes are now built as **Express** routes running as a separate server/process, not as Next.js `app/api/*/route.ts` handlers. Next.js is frontend-only (Person C's pages). See **Section 0** below before reading anything else — it changes file paths and route signatures referenced throughout the rest of this document and all three `BUILD_PERSON_*.md` files.

---

## ⚠️ RULE ZERO — unchanged from v1

Build exactly what is specified. Do not invent, assume, extend, or "improve" beyond what is written. If something is missing or ambiguous, STOP and ask — do not silently fill the gap. See BUILD_PERSON_*.md files for full per-person task detail; this file is the cross-cutting reference.

---

## PROJECT SUMMARY

"PeoplePay360" — HR & Payroll platform. Employee is the central record, linked to Contracts (period-specific), Working Schedules, Attendance, Time Off (types/allocations/requests), and Payroll (Salary Structures/Rules → Payruns → Payslips). The differentiator: a real, computed Salary Rule engine (mathjs) that resolves the period-correct contract and runs rules in sequence.

**Team:** 3 people | **Time:** 18 hours | **Stack:** Next.js (App Router, TS) + Prisma + PostgreSQL + Tailwind + mathjs + zod + bcryptjs + jsonwebtoken + BullMQ/ioredis (Person B) + @react-pdf/renderer + exceljs.

---

## 0) ARCHITECTURE SPLIT — Next.js (frontend) + Express (backend)

### 0a. Two processes, two package.json files, one repo (monorepo, not two repos)

```
peoplepay360/
├── web/                    ← Next.js app (Person C only — pages, components, no API routes)
│   ├── package.json
│   ├── app/                (pages only — NO app/api/* anymore)
│   └── ...
├── server/                 ← Express app (Person A + Person B — all API routes)
│   ├── package.json
│   ├── src/
│   │   ├── index.ts        ← Express app entrypoint, CORS, helmet, route mounting
│   │   ├── middleware/
│   │   │   ├── auth.ts     ← requireAuth, requireRole as Express middleware [Person A]
│   │   │   └── errorHandler.ts  [Person A]
│   │   ├── lib/            ← same shared libs as before (prisma.ts, contracts.ts, attendance.ts, audit.ts, errorLog.ts, payroll/*)
│   │   └── routes/
│   │       ├── auth.ts
│   │       ├── employees.ts
│   │       ├── contracts.ts
│   │       ├── schedules.ts
│   │       ├── attendance.ts
│   │       ├── timeoff.ts
│   │       ├── auditLog.ts
│   │       ├── errorLog.ts
│   │       ├── salaryStructures.ts
│   │       ├── salaryRules.ts
│   │       ├── payruns.ts
│   │       ├── payslips.ts
│   │       └── dashboard.ts
│   └── prisma/             ← schema.prisma, seed.ts, migrations (unchanged, still Person A's)
└── package.json            ← root, optional, can just hold a `dev` script running both via concurrently
```

**Why `web/` + `server/` as subfolders of one repo, not two separate repos:** keeps one `git clone`, one PR review flow, and lets `INTEGRATION.md`'s branch-naming and merge rules keep working unmodified. Person A and Person B work almost entirely in `server/`; Person C works almost entirely in `web/`.

### 0b. Route signature conversion (every route in BUILD_PERSON_A.md and BUILD_PERSON_B.md must be rewritten this way)

**Before (Next.js route handler):**
```typescript
// app/api/employees/route.ts
export async function GET(req: NextRequest) {
  const session = getSessionUser(req);
  requireRole(session, ['HR_MANAGER', 'ADMIN']);
  const employees = await prisma.employee.findMany(...);
  return Response.json(employees);
}
```

**After (Express router + middleware):**
```typescript
// server/src/routes/employees.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/', requireAuth, requireRole(['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']), asyncHandler(async (req, res) => {
  const employees = await prisma.employee.findMany(...);
  res.json(employees);
}));

export default router;
```

**Key differences to apply everywhere, consistently, across all routes:**
- `getSessionUser(req)` + `requireRole(session, [...])` (two manual lines inside the handler) becomes **two middleware functions in the route definition**: `requireAuth` (verifies JWT, attaches `req.session`) and `requireRole([...])` (checks `req.session.role`).
- `return Response.json(x)` becomes `res.json(x)` (no `return`, and status codes are `res.status(201).json(x)` not `Response.json(x, { status: 201 })`).
- Every async route handler must be wrapped in `asyncHandler` (below) — Express does not auto-catch rejected promises like Next's route handlers effectively do, so an unwrapped throw inside an `async` route handler will hang the request instead of reaching your error handler.
- EMPLOYEE-role ownership checks (e.g. "can only see their own record") stay as manual `if` checks inside the handler body — those don't become middleware since they're record-specific, not role-generic.

**`server/src/lib/asyncHandler.ts`** (new, small, required):
```typescript
import { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

**`server/src/middleware/auth.ts`** (replaces `/lib/auth.ts`'s `getSessionUser`/`requireRole` — Person A owns this):
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface Session { userId: string; email: string; role: string; employeeId?: string; }
declare global {
  namespace Express {
    interface Request { session?: Session; }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.session = jwt.verify(token, process.env.JWT_SECRET!) as Session;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireRole(allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !allowed.includes(req.session.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

**`server/src/middleware/errorHandler.ts`** (replaces `handleApiError` — Person A owns this, mounted LAST in `index.ts` after all routes):
```typescript
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../lib/apiError';
import { writeErrorLog } from '../lib/errorLog';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error('[API ERROR]', req.path, err);
  writeErrorLog({ route: req.path, userId: req.session?.userId, message: (err as Error)?.message ?? 'Unknown error', stack: (err as Error)?.stack }).catch(() => {});
  return res.status(500).json({ error: 'Internal server error' });
}
```
`ApiError` itself (the class with `status` + `message`) is unchanged — move it to `server/src/lib/apiError.ts`, still exported the same way, still thrown the same way from inside route handlers (zod validation failures, business-rule rejections like the 409 contract overlap, etc.).

**`server/src/index.ts`** (new entrypoint — Person A owns this):
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import contractRoutes from './routes/contracts';
import scheduleRoutes from './routes/schedules';
import attendanceRoutes from './routes/attendance';
import timeoffRoutes from './routes/timeoff';
import auditLogRoutes from './routes/auditLog';
import errorLogRoutes from './routes/errorLog';
import salaryStructureRoutes from './routes/salaryStructures';
import salaryRuleRoutes from './routes/salaryRules';
import payrunRoutes from './routes/payruns';
import payslipRoutes from './routes/payslips';
import dashboardRoutes from './routes/dashboard';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/timeoff', timeoffRoutes);
app.use('/api/audit-log', auditLogRoutes);
app.use('/api/error-log', errorLogRoutes);
app.use('/api/salary-structures', salaryStructureRoutes);
app.use('/api/salary-rules', salaryRuleRoutes);
app.use('/api/payruns', payrunRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(errorHandler); // must be LAST — after all routes

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => console.log(`Express API listening on :${PORT}`));
```

### 0c. Frontend changes (Person C)

`lib/api.ts`'s `apiFetch` now needs an absolute base URL instead of relative paths, since the frontend (port 3000) and backend (port 4000) are different origins:

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

`web/app/api/dashboard/route.ts` **no longer exists as a Next.js route** — it moves to `server/src/routes/dashboard.ts` and Person C now consumes it via `apiFetch('/api/dashboard?...')` like every other route, rather than owning a Next.js API route. Person C's file list, DO NOT list, and Contracts-You-Must-Honor section in `BUILD_PERSON_C.md` are updated accordingly (see that file's Express Migration Addendum).

### 0d. New/changed environment variables

```env
# server/.env
DATABASE_URL="postgresql://pp360_user:...@[LAN_IP]:5432/peoplepay360"
JWT_SECRET="[min 32 char random string]"
REDIS_HOST="localhost"
REDIS_PORT="6379"
PORT=4000
WEB_ORIGIN="http://localhost:3000"       # for CORS — set to the frontend's real origin/LAN IP
NODE_ENV="development"

# web/.env.local
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"   # or http://[server LAN IP]:4000
```

Both `.env` files are gitignored from commit 1 (same rule as before, now applies to two files).

### 0e. New dependencies

```bash
# server/
npm i express cors helmet
npm i -D @types/express @types/cors supertest @types/supertest

# web/ — no new deps beyond what BUILD_PERSON_C.md already lists
```

### 0f. Running both processes locally

```bash
# terminal 1
cd server && npm run dev     # nodemon/ts-node-dev, listens on :4000

# terminal 2
cd web && npm run dev        # next dev, listens on :3000
```
Or add a root `package.json` script using `concurrently` if the team prefers one command:
```json
{ "scripts": { "dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix web\"" } }
```

### 0g. What does NOT change

- Prisma schema, seed script, `computeSalaryRules`, PDF/Excel generation, BullMQ worker, role permission matrix, security requirements, sync checkpoint *content* (only which commands you run at each checkpoint changes slightly — see `INTEGRATION.md`'s addendum).
- The **business logic inside every route handler** — only the outer signature (`(req: NextRequest) => Response.json(...)` vs `(req, res) => res.json(...)`) and where role-checking happens (inline vs middleware) change.

---

## 1) POSTGRES SETUP — EXACT COMMANDS TO RUN

These are commands you run on your own machine (or the one designated to host Postgres per INTEGRATION.md's LAN setup). The AI coding agent will NOT run these for you automatically unless you're using its bash/terminal tool with Postgres already installed and reachable — either way, run them yourself once and paste the resulting `DATABASE_URL` into `.env`.

### 1a. Install Postgres (skip if already installed)
```bash
# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt update && sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows: use the official installer from postgresql.org, or WSL + the Ubuntu commands above
```

### 1b. Create the database + a dedicated user (run once, on the host machine)
```bash
# Open the Postgres CLI as the postgres superuser
sudo -u postgres psql          # Linux
psql postgres                  # macOS (Homebrew, no sudo needed)

# Inside psql, run:
CREATE DATABASE peoplepay360;
CREATE USER pp360_user WITH ENCRYPTED PASSWORD 'choose-a-real-password-here';
GRANT ALL PRIVILEGES ON DATABASE peoplepay360 TO pp360_user;
\q
```

### 1c. Confirm the connection string
```
DATABASE_URL="postgresql://pp360_user:choose-a-real-password-here@[LAN_IP or localhost]:5432/peoplepay360"
```
Put this exact string in `.env` on **all three machines** (per INTEGRATION.md's LAN setup — one machine hosts Postgres, the other two connect over LAN using that machine's local IP instead of `localhost`).

### 1d. Let Postgres accept LAN connections (only needed if teammates connect over LAN, not localhost)
```bash
# Find and edit postgresql.conf — uncomment/set:
listen_addresses = '*'

# Edit pg_hba.conf — add a line allowing your LAN subnet, e.g.:
host    all             all             192.168.1.0/24          md5

# Then restart:
sudo systemctl restart postgresql        # Linux
brew services restart postgresql@16      # macOS
```

### 1e. Once `.env` is in place, Prisma takes over — these are the commands Person A runs (and the ones the agent will run for you when building Task 2 of BUILD_PERSON_A.md)
```bash
npx prisma migrate dev --name init     # creates tables from schema.prisma
npx prisma generate                    # regenerates the Prisma Client
npx prisma db seed                     # runs prisma/seed.ts
npx prisma studio                      # optional — opens a GUI to inspect data at http://localhost:5555
```

**Yes — the agent should run these for you** as part of Task 1/Task 2 in BUILD_PERSON_A.md, using its bash tool, once `.env` exists with a valid `DATABASE_URL`. The one thing no agent can do for you is step 1a/1b — actually installing Postgres and creating the database/user/password — because that requires access to a real running Postgres instance on your machine, which the agent's sandboxed environment doesn't have unless you're running it locally in something like Claude Code or your own terminal.

---

## 2) COMPLETE FILE STRUCTURE (all three people combined — Next.js + Express split)

```
peoplepay360/
├── package.json                           ← root, optional `dev` script via concurrently
├── web/                                   ← Next.js — FRONTEND ONLY, no API routes
│   ├── .env.local                         ← NEXT_PUBLIC_API_BASE_URL (gitignored)
│   ├── .gitignore
│   ├── package.json
│   ├── reference/
│   │   └── frontend-base/                 ← design reference
│   ├── lib/
│   │   ├── api.ts                         [Person C]  — client fetch wrapper (absolute API_BASE)
│   │   └── auth-client.ts                 [Person C]  — client session helpers
│   ├── components/
│   │   ├── ui/                            [Person C]  — Button, Input, Select, Table, Badge, Card, Modal
│   │   └── layout/
│   │       ├── Nav.tsx                    [Person C]
│   │       └── TopBar.tsx                 [Person C]
│   ├── app/
│   │   ├── layout.tsx                     [Person C]
│   │   ├── page.tsx                       [Person C]
│   │   ├── (auth)/login/page.tsx          [Person C]
│   │   └── (dashboard)/
│   │       ├── layout.tsx                 [Person C]
│   │       ├── dashboard/page.tsx         [Person C]
│   │       ├── employees/{page,new/page,[id]/page}.tsx     [Person C]
│   │       ├── contracts/{page,new/page,[id]/page}.tsx     [Person C]
│   │       ├── schedules/{page,[id]/page}.tsx              [Person C]
│   │       ├── attendance/{page,[id]/page}.tsx             [Person C]
│   │       ├── timeoff/{requests,allocations,types}/page.tsx [Person C]
│   │       ├── payroll/{page,new/page,[id]/page}.tsx       [Person C]
│   │       ├── payslips/{page,[id]/page}.tsx               [Person C]
│   │       ├── salary-structures/{page,[id]/page}.tsx      [Person C]
│   │       ├── salary-rules/{page,new/page,[id]/page}.tsx  [Person C]
│   │       └── audit-log/page.tsx                          [Person C]
│   └── __tests__/person-c/
│       ├── employee-form.test.tsx
│       ├── payrun-processing.test.tsx
│       ├── timeoff-approve.test.tsx
│       └── security.test.tsx
│
└── server/                                ← Express — ALL API routes, all backend logic
    ├── .env                               ← DATABASE_URL, JWT_SECRET, PORT, WEB_ORIGIN, REDIS_* (gitignored)
    ├── .gitignore
    ├── package.json
    ├── prisma/
    │   ├── schema.prisma                  [Person A]
    │   ├── seed.ts                        [Person A]
    │   └── migrations/                    [Person A — never touched by B/C]
    └── src/
        ├── index.ts                       [Person A]  — Express app, CORS, helmet, route mounting
        ├── middleware/
        │   ├── auth.ts                    [Person A]  — requireAuth, requireRole
        │   └── errorHandler.ts            [Person A]
        ├── lib/
        │   ├── prisma.ts                  [Person A]
        │   ├── apiError.ts                [Person A]
        │   ├── asyncHandler.ts            [Person A]
        │   ├── contracts.ts               [Person A]  — getActiveContractForPeriod
        │   ├── attendance.ts              [Person A]  — getWorkedDaysForPeriod
        │   ├── audit.ts                   [Person A]  — writeAuditLog
        │   ├── errorLog.ts                [Person A]  — writeErrorLog
        │   └── payroll/
        │       ├── computeRules.ts        [Person B]  — the rule engine
        │       ├── generatePdf.ts         [Person B]
        │       ├── queue.ts               [Person B]  — BullMQ setup
        │       └── workers/sendPayslips.ts [Person B]
        └── routes/
            ├── auth.ts                    [Person A]
            ├── employees.ts               [Person A]
            ├── contracts.ts               [Person A]
            ├── schedules.ts               [Person A]
            ├── attendance.ts              [Person A]
            ├── timeoff.ts                 [Person A]  — types + allocations + requests + approve/refuse
            ├── auditLog.ts                [Person A]
            ├── errorLog.ts                [Person A]
            ├── salaryStructures.ts        [Person B]
            ├── salaryRules.ts             [Person B]
            ├── payruns.ts                 [Person B]  — create, eligible-employees, employees, compute, validate, mark-paid, send-payslips
            ├── payslips.ts                [Person B]  — list, detail, pdf, export-excel
            └── dashboard.ts               [Person C]  — the one route Person C owns, now an Express route
    └── __tests__/
        ├── person-a/
        │   ├── contracts.test.ts
        │   ├── contract-overlap.test.ts
        │   ├── timeoff-approve.test.ts
        │   ├── schedule-hours.test.ts
        │   └── security.test.ts          ← now uses supertest against the Express app
        └── person-b/
            ├── computeRules.test.ts
            ├── payrun-compute.test.ts
            ├── live-rule-edit.test.ts
            ├── pdf.test.ts
            └── security.test.ts          ← now uses supertest against the Express app
```

Note the reorganized test layout: **frontend tests live in `web/__tests__/person-c/`, backend tests live in `server/__tests__/person-a/` and `server/__tests__/person-b/`** — following each person's code into whichever process it now runs in.

---

## 3) FULL DATA MODEL (Prisma schema — Person A builds this exactly, Hour 0-1)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role
  employee  Employee?
}

enum Role {
  EMPLOYEE
  HR_MANAGER
  HR_PAYROLL_USER
  HR_PAYROLL_MANAGER
  ADMIN
}

model Employee {
  id                 String    @id @default(cuid())
  name               String
  department         String
  managerId          String?
  jobPosition        String
  scheduleId         String?
  schedule           WorkingSchedule? @relation(fields: [scheduleId], references: [id])
  status             String    @default("active")
  bankAccountNumber  String?
  userId             String?   @unique
  user               User?     @relation(fields: [userId], references: [id])
  contracts          Contract[]
  attendances        Attendance[]
  timeOffRequests    TimeOffRequest[]
  allocations        Allocation[]
  payslips           Payslip[]
}

model Contract {
  id                String   @id @default(cuid())
  employeeId        String
  employee          Employee @relation(fields: [employeeId], references: [id])
  startDate         DateTime
  endDate           DateTime?
  wage              Float
  department        String
  position          String
  salaryStructureId String
  salaryStructure   SalaryStructure @relation(fields: [salaryStructureId], references: [id])
  status            String   @default("active") // active | expired | draft
  @@index([employeeId, startDate, endDate])
}

model WorkingSchedule {
  id          String   @id @default(cuid())
  name        String
  type        String
  lines       ScheduleLine[]
  employees   Employee[]
}

model ScheduleLine {
  id          String   @id @default(cuid())
  scheduleId  String
  schedule    WorkingSchedule @relation(fields: [scheduleId], references: [id])
  day         String
  startTime   String
  endTime     String
  breakMins   Int      @default(0)
}

model Attendance {
  id          String   @id @default(cuid())
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id])
  checkIn     DateTime
  checkOut    DateTime?
  workedHours Float?
  status      String   @default("normal") // normal | exception | corrected
  @@index([employeeId, checkIn])
}

model TimeOffType {
  id                  String   @id @default(cuid())
  name                String
  unit                String   // days | hours
  requiresAllocation  Boolean  @default(true)
  payrollIntegrated   Boolean  @default(false)
  allocations         Allocation[]
  requests            TimeOffRequest[]
}

model Allocation {
  id           String   @id @default(cuid())
  employeeId   String
  employee     Employee @relation(fields: [employeeId], references: [id])
  typeId       String
  type         TimeOffType @relation(fields: [typeId], references: [id])
  allocated    Float
  taken        Float    @default(0)
  validFrom    DateTime
  validTo      DateTime
  approved     Boolean  @default(false)
  @@index([employeeId, typeId])
}

model TimeOffRequest {
  id          String   @id @default(cuid())
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id])
  typeId      String
  type        TimeOffType @relation(fields: [typeId], references: [id])
  startDate   DateTime
  endDate     DateTime
  duration    Float
  status      String   @default("pending") // pending | approved | refused
  @@index([employeeId, status])
}

model SalaryStructure {
  id        String   @id @default(cuid())
  name      String
  rules     SalaryRule[]
  contracts Contract[]
  payruns   Payrun[]
}

model SalaryRule {
  id                String   @id @default(cuid())
  structureId       String
  structure         SalaryStructure @relation(fields: [structureId], references: [id])
  name              String
  code              String   // BASIC, HRA, GROSS, NET, etc.
  category          String   // Basic | Allowance | Gross | Deduction | Net
  sequence          Int
  computationMethod String   // fixed | percentage | formula
  amount            Float?
  percentageOf      String?
  percentageValue   Float?
  formula           String?  // mathjs expression
}

model Payrun {
  id                String   @id @default(cuid())
  name              String
  periodStart       DateTime
  periodEnd         DateTime
  salaryStructureId String
  salaryStructure   SalaryStructure @relation(fields: [salaryStructureId], references: [id])
  status            String   @default("draft") // draft | computed | validated | paid
  payslips          Payslip[]
}

model Payslip {
  id           String   @id @default(cuid())
  payrunId     String
  payrun       Payrun   @relation(fields: [payrunId], references: [id])
  employeeId   String
  employee     Employee @relation(fields: [employeeId], references: [id])
  contractId   String
  workedDays   Float
  status       String   @default("draft") // draft | computed | validated | paid
  lines        PayslipLine[]
  warnings     String[]
  netSalary    Float?
  @@index([payrunId])
  @@index([employeeId])
}

model PayslipLine {
  id         String   @id @default(cuid())
  payslipId  String
  payslip    Payslip  @relation(fields: [payslipId], references: [id])
  code       String
  name       String
  category   String
  amount     Float
  @@index([payslipId])
}

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

---

## 4) SETUP STEPS, IN ORDER (split repo — Person A runs both halves' scaffolding)

```bash
mkdir peoplepay360 && cd peoplepay360
mkdir web server

# --- server (Express + Prisma) ---
cd server
npm init -y
npm i express cors helmet prisma @prisma/client mathjs bcryptjs jsonwebtoken zod @react-pdf/renderer exceljs bullmq ioredis
npm i -D typescript ts-node ts-node-dev @types/node @types/express @types/cors @types/bcryptjs @types/jsonwebtoken jest ts-jest @types/jest supertest @types/supertest
npx tsc --init
echo ".env" >> .gitignore

npx prisma init          # creates server/prisma/schema.prisma — replace with the schema in Section 3
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed

# server/.env must exist with DATABASE_URL, JWT_SECRET, PORT, WEB_ORIGIN, REDIS_HOST, REDIS_PORT — see Section 0d
# server/package.json scripts: "dev": "ts-node-dev --respawn src/index.ts"

cd ..

# --- web (Next.js) ---
npx create-next-app@latest web --typescript --tailwind --app
cd web
echo ".env.local" >> .gitignore
# web/.env.local must exist with NEXT_PUBLIC_API_BASE_URL — see Section 0d
cd ..
```

Run both with two terminals (`cd server && npm run dev` / `cd web && npm run dev`), or add a root `concurrently` script per Section 0f.

---

## 5) ROLE PERMISSION MATRIX (single source of truth — every route's `requireRole` call must match this exactly)

| Module | EMPLOYEE | HR_MANAGER | HR_PAYROLL_USER | HR_PAYROLL_MANAGER | ADMIN |
|---|---|---|---|---|---|
| Employees (read) | own only | all | all | all | all |
| Employees (write) | — | full CRUD | — | full CRUD | full CRUD |
| Contracts | — | full CRUD | read only | full CRUD | full CRUD |
| Working Schedules | read | full CRUD | read | full CRUD | full CRUD |
| Attendance | own only (CRU) | full | full | full | full |
| Time Off Types | read | full CRUD | read | full CRUD | full CRUD |
| Allocations | own read | full CRUD | read | full CRUD | full CRUD |
| Time Off Requests | own CR | full + approve/refuse | read | full + approve/refuse | full |
| Salary Structures | — | — | read only | full CRUD | full CRUD |
| Salary Rules | — | — | read only | full CRUD | full CRUD |
| Payruns | — | — | create/read/update | full CRUD | full CRUD |
| Payslips | own read only | — | read all | read all | read all |
| Audit Log | — | — | — | read | read |
| Error Log | — | — | — | — | read |
| Dashboard | — | read | read | read | read |

This table is what every `security.test.ts`/`security.test.tsx` file across all three people's builds is checking against. If a test and this table disagree, this table wins — flag the discrepancy and fix the test or the route, don't silently pick one.

---

## 6) SECURITY REQUIREMENTS (recap — full detail lives in each BUILD_PERSON file's own security.test section)

1. Every API route calls `getSessionUser` + `requireRole` (or an ownership check) as its first lines — before any DB query.
2. `EMPLOYEE`-role users only ever see their own Attendance, TimeOffRequest, Payslip, and Allocation records.
3. Passwords hashed with bcrypt everywhere, including in the seed script.
4. `.env` (holding `JWT_SECRET`, `DATABASE_URL`) is gitignored from the first commit.
5. All write-route bodies validated with zod before touching the DB or `mathjs.evaluate()`.
6. Raw SQL only via Prisma's tagged-template `$queryRaw`. Never `$queryRawUnsafe` or string concatenation.
7. No Postgres Row-Level Security — explicitly out of scope (see MASTER v1 rationale).
8. **Nav-link hiding (Person C) is never a substitute for API-level 403s (Person A/B).** Both layers are required; each is tested independently — UI tests in `web/__tests__/person-c/security.test.tsx`, API tests in `server/__tests__/person-a/security.test.ts` and `server/__tests__/person-b/security.test.ts`.

**Express-specific additions (v3 — new with the split, all Person A's responsibility in `server/src/index.ts`):**
9. **CORS is locked to `WEB_ORIGIN`**, not `origin: '*'`. A wildcard origin combined with `credentials: true` is rejected by browsers anyway, but more importantly it would let any site call your API with a stolen token. `WEB_ORIGIN` must be the frontend's actual origin (localhost:3000 in dev, the real LAN IP/domain at demo time).
10. **`helmet()` is mounted before any route** — sets sane default security headers (no `X-Powered-By: Express` fingerprinting, basic XSS/sniffing protections). This is a 2-line addition with no logic of its own to get wrong, so there's no excuse to skip it.
11. **`express.json()` body size is left at Express's default limit** unless a specific large-payload need arises — do not set `{ limit: '50mb' }` or similar "to be safe," since an oversized limit is itself a denial-of-service surface (large bodies chew memory before your zod validation even runs).
12. **The Express error handler (`errorHandler.ts`) must be the last `app.use()` call**, after every route is mounted — Express error-handling middleware is only reached if it's registered after the routes that might throw. Getting this order wrong means errors go completely unhandled instead of returning your intended 500/`ApiError` response.
13. **Trust proxy setting**: if the Express app sits behind any reverse proxy at demo time (unlikely for a LAN hackathon setup, but flag it if it comes up), `app.set('trust proxy', 1)` is needed for correct client IP handling — out of scope for the LAN setup in Section 0f, only relevant if this gets deployed publicly later.

**Full security test coverage now exists in all three build files:**
- `BUILD_PERSON_A.md` → `server/__tests__/person-a/security.test.ts` — RBAC on Employee/Contract/Attendance/TimeOff routes, no-token/malformed-token cases, SQL-injection-safe input handling, now run via `supertest(app)` against the real Express app instead of manual `fetch` calls to a running dev server.
- `BUILD_PERSON_B.md` → `server/__tests__/person-b/security.test.ts` — RBAC on Salary Structure/Rule/Payrun/Payslip routes, cross-employee payslip isolation, payrun status-gate enforcement, input validation, same `supertest(app)` pattern.
- `BUILD_PERSON_C.md` → `web/__tests__/person-c/security.test.tsx` — nav/button visibility per role, pages handling a real 403 response gracefully, plus (new in v3) a CORS-failure UI state test — see that file's addendum.

Run all three suites together at the Hour 14 and Hour 17 sync checkpoints defined in `INTEGRATION.md`.

---

## 7) EVERYTHING ELSE (per-person tasks, integration contracts, demo script, sync checkpoints)

This file is the cross-cutting reference (schema, file tree, Postgres setup, role matrix). For step-by-step build instructions, use alongside:
- `BUILD_PERSON_A.md` — Data & Core HR
- `BUILD_PERSON_B.md` — Payroll Engine
- `BUILD_PERSON_C.md` — Frontend & Dashboard
- `INTEGRATION.md` — merge order, interface contracts, sync checkpoints, demo path, environment variables

Give the agent all five files together at the start of the build.
