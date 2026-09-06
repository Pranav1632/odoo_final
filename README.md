# PeoplePay360 — Enterprise HR, Contracts & Payroll SaaS Platform

PeoplePay360 is a full-featured, multi-tenant enterprise HR management and automated payroll platform. Built with a modern microservices-ready architecture, it delivers end-to-end employee lifecycle management, flexible salary structures, rule-based payroll computation, background mail processing, and comprehensive audit and error tracking.

---

## 🌟 Key Features

### 🔐 1. Authentication & Role-Based Access Control (RBAC)
- **Granular Roles**: `ADMIN`, `HR_PAYROLL_MANAGER`, `HR_PAYROLL_USER`, `HR_MANAGER`, and `EMPLOYEE`.
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

## 🏗 System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                 React + Vite Frontend                      │
│            (Tailwind CSS, Glassmorphism UI)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON API
┌──────────────────────────────▼──────────────────────────────┐
│                  Express.js / TypeScript API                │
│       (JWT Auth, RBAC Middleware, Zod Validation)          │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐  ┌────────────▼───────────────┐
│     PostgreSQL + Prisma     │  │   BullMQ + Redis Worker    │
│  (310 Employees, Contracts) │  │  (PDF Kit + Mailpit SMTP)  │
└─────────────────────────────┘  └────────────────────────────┘
```

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
