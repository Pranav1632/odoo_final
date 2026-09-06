# PeoplePay360 — Enterprise HR, Contracts & Payroll SaaS Platform

PeoplePay360 is a full-featured enterprise HR management and automated payroll platform. Built with TypeScript, Express, React, and PostgreSQL, it provides end-to-end employee lifecycle management, contract validation, rule-based salary computation, background mail processing, and comprehensive system auditing.

---

## 🏗 Codebase Structure & Architecture

```text
odoo/
├── server/                           # Express + TypeScript REST API Backend
│   ├── prisma/                       # Database ORM & Migrations
│   │   ├── schema.prisma             # PostgreSQL Database Models (User, Employee, Contract, Payrun, etc.)
│   │   ├── seed.ts                   # Realistic Database Seeder (310 Employees across 8 Departments)
│   │   └── user_credentials.csv      # Exported credentials for test logins
│   │
│   ├── src/
│   │   ├── app.ts                    # Express application entrypoint & middleware registration
│   │   ├── index.ts                  # HTTP server listener (Port 4000)
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT verification & role authorization (requireAuth, requireRole)
│   │   │   └── errorHandler.ts       # Global exception handler & Zod validation error formatting
│   │   │
│   │   ├── lib/                      # Core Business Logic & Helpers
│   │   │   ├── apiError.ts           # Structured custom ApiError class
│   │   │   ├── audit.ts              # System audit trail logger (writeAuditLog)
│   │   │   ├── errorLog.ts           # Application error logger (writeErrorLog)
│   │   │   ├── email.ts              # Nodemailer SMTP transport helper (Mailpit support)
│   │   │   ├── attendance.ts         # Worked-hours and active days aggregator
│   │   │   ├── contractUtils.ts      # Active contract overlap validator (getActiveContractForPeriod)
│   │   │   │
│   │   │   └── payroll/              # Payroll Engine & Workers
│   │   │       ├── computeRules.ts   # Rule evaluation engine (fixed, percentage, formula via mathjs)
│   │   │       ├── generatePdf.ts    # Custom PDF payslip renderer using pdfkit
│   │   │       ├── queue.ts          # BullMQ queue & Redis connection definitions
│   │   │       └── workers/
│   │   │           └── sendPayslips.ts # Background mail worker for bulk payslip delivery
│   │   │
│   │   └── routes/                   # REST API Endpoints
│   │       ├── auth.ts               # POST /login, POST /register, GET /me
│   │       ├── employees.ts          # GET/POST/PATCH/DELETE /api/employees & personal info
│   │       ├── contracts.ts          # GET/POST/PATCH/DELETE /api/contracts
│   │       ├── schedules.ts          # GET/POST/PATCH/DELETE /api/working-schedules
│   │       ├── attendance.ts         # GET/POST /api/attendance
│   │       ├── timeoff.ts            # Leave types, allocations, and requests (with Self-Approval Guard)
│   │       ├── salaryStructures.ts   # Structure definitions and salary rules
│   │       ├── payruns.ts            # Eligible employees query, payrun compute, and validate endpoints
│   │       ├── payslips.ts           # GET /api/payslips & GET /api/payslips/:id/pdf
│   │       ├── auditLog.ts           # System audit log query endpoints
│   │       └── errorLog.ts           # System error log query endpoints
│   │
│   └── __tests__/                    # Jest Test Suite
│       ├── person-a/                 # Core HR, Auth, Contract, and Time-off Integration Tests
│       └── person-b/                 # Payroll Engine, Payrun, and Queue Worker Integration Tests
│
└── payroll-dashboard/                # React 18 + Vite Frontend Application
    ├── src/
    │   ├── App.jsx                   # React Router setup & protected route boundaries
    │   ├── index.css                 # Global Tailwind CSS tokens & modern warm neutral theme
    │   ├── components/               # Reusable Design System Components (Topbar, UI Card, Button, Input)
    │   ├── lib/
    │   │   ├── api.js                # Frontend HTTP client & endpoint wrappers
    │   │   └── user.js               # Session state management (getSession, logout)
    │   └── pages/                    # Application Views
    │       ├── Auth.jsx              # Sign-In & Registration Page
    │       ├── Profile.jsx           # Employee Profile & Personal Info Editor
    │       ├── Dashboard.jsx         # Executive Reports & HR Kanban Board
    │       ├── EmployeesList.jsx     # Employee Directory & Filtering
    │       ├── EmployeeView.jsx      # Employee Detailed Profile & History
    │       ├── EmployeeForm.jsx      # Employee Onboarding & Edit Form
    │       ├── ContractsList.jsx     # Contract Management List
    │       ├── ContractForm.jsx      # Contract Creation & Revision Form
    │       ├── TimeOffList.jsx       # Leave Requests & Allocations
    │       ├── PayrunsList.jsx       # Payruns Overview
    │       ├── PayrunWizard.jsx      # 3-Step Payrun Creation Wizard
    │       ├── PayrunDetail.jsx      # Payrun Summary & Itemized Payslips
    │       ├── SalaryStructuresList.jsx # Salary Structures & Rules Management
    │       ├── UserManagement.jsx    # User Account Approval & RBAC Promotion
    │       ├── AuditLog.jsx          # System Audit Trail Viewer
    │       └── ErrorPages.jsx        # Top-level Dedicated Error Components (401, 403, 404, 500)
```

---

## ⚙️ Core Technical Implementation Details

### 🔑 1. Authentication, Approval & Authorization Architecture
- **JWT & Stateless Authentication**: [`server/src/routes/auth.ts`](file:///d:/odoo/odoo/server/src/routes/auth.ts) verifies password hashes using `bcrypt` (10 rounds) and issues signed 8-hour JWT tokens.
- **Strict Registration Gatekeeper**: Self-registered users default strictly to `EMPLOYEE` role with `status: 'pending'`. The login route blocks unapproved users with `403 Forbidden - Your account is awaiting admin approval`.
- **Role Authorization Middleware**: [`server/src/middleware/auth.ts`](file:///d:/odoo/odoo/server/src/middleware/auth.ts) enforces granular endpoint protection across 5 roles (`ADMIN`, `HR_PAYROLL_MANAGER`, `HR_PAYROLL_USER`, `HR_MANAGER`, `EMPLOYEE`).
- **Frontend Permission Protection**: [`payroll-dashboard/src/App.jsx`](file:///d:/odoo/odoo/payroll-dashboard/src/App.jsx) wraps routes in `ProtectedRoute` and auto-clears stale sessions. Unauthorized access redirects to top-level dedicated error components ([`ErrorPages.jsx`](file:///d:/odoo/odoo/payroll-dashboard/src/pages/ErrorPages.jsx)).

---

### 👥 2. Core HR, Employee Directory & Contract Validation
- **Data Models**: Defined in [`schema.prisma`](file:///d:/odoo/odoo/server/prisma/schema.prisma) with explicit relations between `User`, `Employee`, `Contract`, `WorkingSchedule`, and `Department`.
- **Active Contract Overlap Protection**: [`server/src/lib/contractUtils.ts`](file:///d:/odoo/odoo/server/src/lib/contractUtils.ts) validates date ranges on contract creation/update. A newly activated contract automatically transitions existing active contracts for the employee to `close`.
- **Employee Directory & Filtering**: [`payroll-dashboard/src/pages/EmployeesList.jsx`](file:///d:/odoo/odoo/payroll-dashboard/src/pages/EmployeesList.jsx) displays department counts, active/inactive statuses, search filters, and employee details view.
- **Personal Details Editing**: [`payroll-dashboard/src/pages/Profile.jsx`](file:///d:/odoo/odoo/payroll-dashboard/src/pages/Profile.jsx) provides self-service access to own attendance, contract, payslips, and bank account editing.

---

### 🌴 3. Time-Off Engine & Self-Approval Guard
- **Time-Off Workflow**: Managed via [`server/src/routes/timeoff.ts`](file:///d:/odoo/odoo/server/src/routes/timeoff.ts) across Leave Types (`Paid Time Off`, `Sick Leave`), Allocations, and Requests.
- **Self-Approval Prevention Guard**: Explicit backend check on `PATCH /api/time-off/requests/:id/approve` and `/refuse`:
  ```typescript
  if (request.employeeId === session.employeeId) {
    throw new ApiError(403, 'Cannot approve your own time off request');
  }
  ```
- **Automatic Allocation Balance Deductions**: When a request is approved inside a Prisma transaction, the employee's remaining allocation balance is decremented automatically.

---

### 🧮 4. Salary Engine & Payroll Computation
- **Rule Computation Engine**: Implemented in [`server/src/lib/payroll/computeRules.ts`](file:///d:/odoo/odoo/server/src/lib/payroll/computeRules.ts):
  - **`fixed`**: Static values (`amount`).
  - **`percentage`**: Multiplies previously calculated scope variables (`scope[percentageOf] * percentageValue / 100`).
  - **`formula`**: Evaluates mathematical strings dynamically via `mathjs` safely (`BASIC * 0.12`).
- **Sequential Scope Accumulation**: Rules execute strictly by `sequence` integer order, building up a dynamic execution scope dictionary.
- **Payrun State Lifecycle**:
  - `GET /api/payroll/payruns/eligible-employees`: Selects active employees with valid overlapping contracts.
  - `POST /api/payroll/payruns/:id/compute`: Executes rule computation across all eligible employees (`draft` → `computed`).
  - `POST /api/payroll/payruns/:id/validate`: Finalizes payrun (`computed` → `done`) and generates itemized payslips.

---

### 📧 5. Asynchronous Queue & Bulk Mail Worker
- **BullMQ + Redis Task Queue**: [`server/src/lib/payroll/queue.ts`](file:///d:/odoo/odoo/server/src/lib/payroll/queue.ts) initializes Redis connection and job queue `payslip-send`.
- **Background Worker**: [`server/src/lib/payroll/workers/sendPayslips.ts`](file:///d:/odoo/odoo/server/src/lib/payroll/workers/sendPayslips.ts) executes bulk send jobs in background without blocking HTTP responses.
- **PDF Generation**: [`server/src/lib/payroll/generatePdf.ts`](file:///d:/odoo/odoo/server/src/lib/payroll/generatePdf.ts) formats itemized PDF payslip attachments using `pdfkit`.
- **SMTP Mailpit Integration**: [`server/src/lib/email.ts`](file:///d:/odoo/odoo/server/src/lib/email.ts) transmits SMTP emails to Mailpit (`localhost:1025`).
- **Batch Fault Isolation**: Errors for missing emails or SMTP connection issues write to `ErrorLog` without failing the remaining batch.

---

### 📊 6. System Auditing & Error Tracking
- **Audit Logs**: [`server/src/lib/audit.ts`](file:///d:/odoo/odoo/server/src/lib/audit.ts) writes audit entries (`writeAuditLog`) for all CREATE, UPDATE, and DELETE operations, visible in [`AuditLog.jsx`](file:///d:/odoo/odoo/payroll-dashboard/src/pages/AuditLog.jsx).
- **Error Logs**: [`server/src/lib/errorLog.ts`](file:///d:/odoo/odoo/server/src/lib/errorLog.ts) captures unhandled API exceptions and background queue errors (`writeErrorLog`).

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18+ recommended)
- **PostgreSQL**
- **Redis** (for background email queues)
- **Mailpit** (for local SMTP testing)

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd server

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Run database migrations and seed realistic data (310 Employees)
npx prisma db push
npx prisma db seed

# Start development server
npm run dev
```
The backend API server will run on `http://localhost:4000`.

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd payroll-dashboard

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
The application will be available at `http://localhost:5173`.

---

## 🔑 Demo Credentials

A seed database with **310 realistic employees** across 8 departments is included. You can use the following default credentials to test different RBAC roles:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@peoplepay360.com` | `Admin@123` | Full system access, User Management, Audit & Error Logs |
| **HR Payroll Manager** | `payroll.manager@peoplepay360.com` | `Manager@123` | Payrun Wizard, Salary Structures, Contract Approval |
| **HR Payroll User** | `payroll.user@peoplepay360.com` | `User@123` | Contract & Payrun entry, Payslip generation |
| **HR Manager** | `hr.manager@peoplepay360.com` | `Hr@123` | Core HR, Employee Directory, Working Schedules, Time-off |
| **Employee** | `emp1@peoplepay360.com` | `Emp@123` | Self-service (My Profile, Attendance, Time-off, My Payslips) |

> 📄 Complete test credentials CSV exported to: [`server/prisma/user_credentials.csv`](file:///d:/odoo/odoo/server/prisma/user_credentials.csv).

---

## 🧪 Running Tests

```bash
# Run backend test suite (Jest + Integration tests)
cd server
npm test
```

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, React Router DOM, Tailwind CSS.
- **Backend**: Node.js, Express, TypeScript, Zod, JWT.
- **Database & ORM**: PostgreSQL, Prisma ORM.
- **Background Tasks & Queue**: Redis, BullMQ, `pdfkit`, `nodemailer`.
- **Local SMTP Server**: Mailpit (`localhost:1025`, Web UI `localhost:8025`).
