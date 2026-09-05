# PeoplePay360 — Post-Build Enhancement Plan

## Purpose

This document is the implementation plan for the recommended production-oriented stack additions in `techstackfinal.md`.

Use it **only after** the current core build is complete. Until then, `MASTER_BUILD_SPEC.md`, `BUILD_PERSON_A.md`, `BUILD_PERSON_B.md`, `BUILD_PERSON_C.md`, and `INTEGRATION.md` remain the implementation source of truth.

## Core Build Completion Gate

Do not begin this phase until all of the following are true:

- The `web/` Next.js frontend and `server/` Express API run together successfully.
- Prisma migrations and seed data complete successfully.
- Core workflows work end-to-end: login, HR data, time off, payroll computation, PDF download, Excel export, and the simulated BullMQ payslip-send job.
- Server and web TypeScript checks pass.
- Server and web test suites, including security tests, pass.
- The demo flow works on the intended LAN setup with no CORS failures.

## Non-Negotiable Compatibility Rules

- Preserve the current `web/` + `server/` architecture.
- Preserve Prisma, PostgreSQL, Redis, Zod, direct JWT RBAC, BullMQ, `@react-pdf/renderer`, and `exceljs`.
- Keep existing `/api/...` routes and response shapes compatible. Do not introduce `/api/v1` during this phase.
- Keep polling for payroll-compute status. Do not add Socket.IO unless a later, explicit scope decision requires live send-progress updates.
- Do not add Passport or optimistic locking without a separate approved design and migration plan.
- Add features in small, independently testable pull requests. Re-run both `server` and `web` test suites after every change.

## Phase 1 — Operational Safety

### 1. Structured logging with Pino

Add `pino` and `pino-http` to the Express server.

- Mount request logging in the Express app shell.
- Send route, request ID, response status, duration, and safe error metadata to logs.
- Never log passwords, JWTs, authorization headers, bank account numbers, or complete employee records.
- Replace new operational `console.log` calls with the shared logger; keep local development output readable.

Acceptance criteria:

- Each API request has structured method, route, status, and duration fields.
- Error logs retain useful context without exposing sensitive data.

### 2. Rate limiting

Add `express-rate-limit`.

- Apply a strict limiter to `POST /api/auth/login`.
- Apply a sensible general limiter to API routes.
- Return a clear `429` JSON response when the limit is exceeded.
- Ensure local test runs can configure or bypass limits without weakening production defaults.

Acceptance criteria:

- Repeated login attempts receive `429`.
- Normal authenticated API usage remains unaffected.

### 3. Compression

Add Express `compression` middleware.

- Mount it in the app shell after security middleware and before routes.
- Do not compress already-compressed PDF responses unless profiling demonstrates value.

Acceptance criteria:

- JSON API responses support compressed transfer when requested by clients.
- PDF download behavior remains correct.

## Phase 2 — Observability

### 4. Sentry error tracking

Add `@sentry/node` to the server and configure it using `SENTRY_DSN`.

- Initialize Sentry before Express is created.
- Capture unhandled route exceptions in the shared error handler.
- Capture BullMQ worker failures.
- Tag events by environment and release version when available.
- Scrub sensitive request data before events leave the server.

Acceptance criteria:

- A controlled server error appears once in Sentry with non-sensitive request context.
- A controlled worker failure appears in Sentry.
- The API continues returning its established JSON error response.

### 5. Bull-Board queue dashboard

Add Bull-Board and expose it at `/admin/queues`.

- Mount it in Express.
- Require authentication and the `ADMIN` role.
- Do not expose it publicly without the same access controls.
- Verify visibility of queued, active, completed, and failed payslip-send jobs.

Acceptance criteria:

- An ADMIN can view the dashboard.
- Every other role and unauthenticated request receives `401` or `403`.
- Failed jobs can be diagnosed from the dashboard and logs.

## Phase 3 — Real Payslip Delivery

### 6. Resend email integration

Replace the current console-only email simulation with real delivery through Resend.

Required environment variables:

```env
RESEND_API_KEY="..."
EMAIL_FROM="PeoplePay360 <payroll@example.com>"
```

- Keep sending in the existing BullMQ worker.
- Use retry-with-backoff for transient provider failures.
- Do not mark a payslip as sent/paid merely because it was queued; update state only after the intended delivery milestone is reached.
- Add idempotency protection so retrying a job does not email the same payslip repeatedly.
- Use a provider test/sandbox address during development.

Acceptance criteria:

- A test payslip is delivered to an approved test inbox.
- Temporary provider failure causes a retry rather than losing the job.
- Duplicate execution does not create duplicate messages.
- Email failures are visible in Pino, Sentry, and Bull-Board.

### 7. Cloud PDF storage (Cloudflare R2 or AWS S3)

Persist generated payslip PDFs in a private bucket rather than only returning generated bytes.

Choose one provider before implementation:

- Cloudflare R2: preferred if S3-compatible storage with predictable cost is desired.
- AWS S3: preferred if the team already uses AWS.

Required changes:

- Add a storage client configured through environment variables.
- Add a Prisma migration to store a non-public object key and generation metadata for each payslip PDF.
- Generate PDFs once per intended payslip version, upload them privately, and reuse the stored object for later downloads or emails.
- Serve downloads through an authenticated API route or short-lived signed URLs; never make payslip buckets public.
- Define retention/deletion rules before storing real employee data.

Acceptance criteria:

- An authorized user can download their own stored payslip PDF.
- An employee cannot access another employee's PDF.
- Repeated downloads do not regenerate the file unnecessarily.
- The bucket is private and no permanent public object URL is exposed.

## Deferred Enhancements — Explicitly Out of Scope

These are not part of this post-build plan unless separately approved:

- Passport / `passport-jwt`
- `/api/v1` API versioning
- Prisma optimistic-locking version columns
- Socket.IO progress updates
- Redis dashboard cache
- Redis Pub/Sub
- PostgreSQL full-text search
- Meilisearch
- TanStack Query, TanStack Table, Zustand, React Hook Form, shadcn/ui, Recharts, or Tremor migrations

They can be evaluated later as focused improvements. None is required for the completed core product to work.

## Recommended Implementation Order

1. Pino logging
2. Rate limiting
3. Compression
4. Sentry
5. Bull-Board
6. Resend
7. R2/S3 PDF storage

Each item should have its own tests, environment documentation, and rollback plan. Apply database migrations only in the PDF-storage step, after backing up the shared PostgreSQL database.

## Required Documentation Updates Per Enhancement

For every completed enhancement, update:

- `server/package.json` dependencies and scripts
- `server/.env.example` with non-secret variable names and explanations
- deployment/demo setup instructions
- relevant API and worker tests
- `techstackfinal.md` to mark the item as implemented

Do not alter the core build documents retroactively unless the enhancement changes an existing public contract.
