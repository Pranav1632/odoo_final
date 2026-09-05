# Throttling/Debouncing Analysis & Plan

**Date:** 2026-09-06  
**Mode:** Ponytail (lazy/pragmatic) — only if absolutely necessary for performance

---

## Executive Summary

**No frontend debouncing/throttling needed for performance.**  
Current codebase has **zero** rapid-fire API triggers from user input.

---

## Current State Audit

### Frontend — Search/Filter Inputs (9 pages)
| Page | Input Type | Triggers API on Change? |
|------|------------|------------------------|
| EmployeesList | Text search + 2 Select dropdowns | ❌ Client-side `useMemo` filter |
| ContractsList | Text search + 2 Select dropdowns | ❌ Client-side `useMemo` filter |
| PayrunsList | Text search + 3 Select dropdowns | ❌ Client-side `useMemo` filter |
| PayslipsList | Text search + 1 Select dropdown | ❌ Client-side `useMemo` filter |
| AttendanceList | Text search + 2 Select dropdowns | ❌ Client-side `useMemo` filter |
| TimeOffList | Text search + 2 Select dropdowns | ❌ Client-side `useMemo` filter |
| AuditLog | Text search + 2 Select dropdowns | ❌ Client-side `useMemo` filter |
| SchedulesList | Text search | ❌ Client-side `useMemo` filter |
| SalaryStructuresList | Text search | ❌ Client-side `useMemo` filter |

**Pattern:** All pages fetch once on mount (`useEffect([], ...)`), then filter in-memory via `useMemo`. URL sync via `setSearchParams` is for shareable links only.

### Dashboard — The Only Page with Reactive API Calls
```jsx
// Dashboard.jsx:246-248
useEffect(() => {
  fetchMetrics();
}, [filters.period, filters.department, filters.employmentType]);
```
- 3 `<Select>` dropdowns (Period, Department, Employee Type)
- Each change → `handleFilterChange` → `setFilters` → triggers `useEffect` → API call
- **Max 3 calls per user interaction** (not keystroke-level)

### Backend — Express Rate Limiting
- **None configured** in `server/src/app.ts`
- No `express-rate-limit` dependency installed

---

## Ponytail Decision Matrix

| Layer | Need | Verdict |
|-------|------|---------|
| Frontend debounce (search inputs) | Zero API calls on keystroke | **SKIP** — solves non-problem |
| Frontend debounce (Dashboard dropdowns) | Max 3 redundant calls if user clicks fast | **OPTIONAL** — 5 lines, low impact |
| Frontend API deduplication (api.js) | No duplicate in-flight requests observed | **SKIP** — YAGNI |
| Backend rate limit (global) | DoS protection | **SKIP** — not a performance issue |
| Backend rate limit (`/api/auth`) | Brute-force protection | **DO** — security hardening, 5 lines |

---

## Recommended Implementation (Only If Absolutely Necessary)

### 1. Backend: Rate Limit on Auth Endpoints (Security, Not Performance)

**File:** `server/src/app.ts`  
**Add after line 52 (after cors):**

```typescript
import rateLimit from 'express-rate-limit';

// Stricter limit on auth endpoints (brute-force protection)
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // 10 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
}));

// Optional: Global gentle limit (uncomment if needed)
// app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
```

**Dependency:** `npm i express-rate-limit @types/express-rate-limit` (in server)

---

### 2. Frontend: Dashboard Filter Debounce (Optional, ~5 lines)

**File:** `payroll-dashboard/src/pages/Dashboard.jsx`  
**Replace `handleFilterChange` (line 250) with:**

```jsx
const debounceRef = useRef(null);

const handleFilterChange = (key, value) => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, 150);
};
```

**Effect:** Rapid dropdown changes within 150ms collapse to single API call.

---

## Files to Modify (If Proceeding)

| File | Change Type | Lines |
|------|-------------|-------|
| `server/src/app.ts` | Add import + middleware | ~12 |
| `server/package.json` | Add dependency | 1 |
| `payroll-dashboard/src/pages/Dashboard.jsx` | Replace handler | ~8 |

---

## Testing Checklist

- [ ] Auth rate limit: `for i in {1..15}; do curl -X POST localhost:4000/api/auth/login -d '{}'; done` → 429 after 10
- [ ] Dashboard: Rapid dropdown toggle → single network request in DevTools
- [ ] Existing tests pass: `npm test` (both server and client)

---

## Decision

> **Default: Do nothing.** Current performance is fine.  
> **Only implement #1 (auth rate limit)** if security hardening is required.  
> **Only implement #2 (dashboard debounce)** if user reports "laggy" filter switching.