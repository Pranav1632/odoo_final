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

## 🌟 Core System Specifications & Module Workflows

### 🔐 1. Authentication & Role-Based Access Control (RBAC)
- **Roles**: `ADMIN`, `HR_PAYROLL_MANAGER`, `HR_PAYROLL_USER`, `HR_MANAGER`, and `EMPLOYEE`.
- **Registration Approval Flow**: Self-registered accounts start as `pending` with `EMPLOYEE` privileges and require Admin approval before accessing the system.
- **Session Protection**: Automatic session invalidation and dedicated top-level error routes (`/401`, `/403`, `/404`, `/500`) with quick account-switching.

### 👥 2. Core HR & Employee Lifecycle
- **Employee Directory**: Profile management, personal data, department allocations, and working schedule assignments.
- **Contract Management**: Multi-currency wage setup, contract start/end dates, state tracking (`draft`, `open`, `close`, `cancel`), and validation rules preventing overlapping active contracts.
- **Attendance & Time-off Engine**:
  - Time-off request workflow (Draft → Submitted → Approved / Refused).
  - Built-in **Self-Approval Guard** preventing managers from approving or refusing their own leave requests.
  - Automatic deduction of remaining leave balances upon approval.

### ⚙️ 3. Dynamic Salary Engine & Payroll Computation
- **Configurable Salary Structures & Rules**:
  - `fixed`: Static amounts (e.g. Basic Salary, Mobile Allowance).
  - `percentage`: Percentage calculations derived from scope variables (e.g. HRA as 40% of BASIC).
  - `formula`: Dynamic math expressions evaluated via `mathjs` (e.g. Provident Fund `BASIC * 0.12`).
- **Sequential Rule Execution**: Rules run strictly in `sequence` order, building up an execution scope.
- **Payrun Lifecycle**:
  - Eligible employee discovery based on active contract dates.
  - One-click batch payrun computation (`draft` → `computed`).
  - Validation step (`done`) generating itemized payslips per employee.

### 📧 4. Asynchronous Bulk Email & Payslip Dispatch
- **Background Mail Queue**: Powered by **BullMQ** and **Redis** for non-blocking asynchronous email processing.
- **PDF Generation**: Generates itemized PDF payslips on the fly using `pdfkit`.
- **Local Mailpit SMTP Support**: Outbound mail delivered to Mailpit (`localhost:1025`) with web UI dashboard (`http://localhost:8025`).
- **Fault-Tolerant Delivery**: Bad email addresses or delivery errors log to `ErrorLog` without blocking the rest of the batch.

### 📊 5. Audit & System Monitoring
- **Audit Logs**: Automatic audit trail for all data mutations (Entity, Action, User ID, Changes payload).
- **Error Logs**: System error logging for background workers, API exceptions, and database errors.

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
