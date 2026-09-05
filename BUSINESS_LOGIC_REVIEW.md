# PeoplePay360 — Real-World Business Logic Review

Scope: after implementing the remaining `PS_FULFILLMENT_REPORT.md` items (real Mailpit-backed email, Employee Type field/filter, hire date, Odoo-style PDF), I did an end-to-end pass checking whether the payroll/HR engine's behavior matches real-world payroll practice, not just the literal PS checklist. One critical gap was found and fixed live; the rest are documented here as findings/recommendations rather than silently patched, since they're judgment calls about how "realistic" this hackathon engine needs to be.

---

## Fixed during this pass

### 1. Duplicate payslip / double-payment — was completely undetected (critical)

**What real payroll systems do:** an employee must never be paid twice for the same period. This is explicitly named in the PS itself (B6: "Highlights warnings such as missing bank details or **duplicate payslips** prior to finalization").

**What this app did before the fix:** nothing. I reproduced it directly — created a second Payrun for the identical August 2026 period, attached an employee who already had a `validated` payslip *and* a `paid` payslip from other August 2026 payruns, computed it, and validated it with **zero warning**. That employee ended up with three payslips for the same month, one of which validated cleanly. `grep -rn "duplicate" server/src` turned up nothing anywhere in the codebase before this fix — the PS's own named requirement was simply never implemented.

**Fix:** `POST /:id/compute` now does one batched query across all payslips in the payrun, checking whether the employee already has a `validated`/`paid` payslip in a *different* payrun whose period overlaps this one. If so, it attaches a `duplicate payslip — ...` warning (naming the conflicting payrun), which — like the existing "missing bank details" warning — now blocks `/validate` until resolved.

**Verified live:** reproduced the exact scenario, confirmed the warning appears on compute and `/validate` now returns `400` with a clear message naming the conflicting payrun. Full test suite (95/95) still passes; existing mocked payrun-compute tests unaffected.

---

## Findings — not fixed, judgment calls (recommend discussing before changing)

### 2. Approved paid leave is invisible to payroll — worked-days calculation only looks at attendance

`getWorkedDaysForPeriod()` (`lib/attendance.ts`) counts only `Attendance` records with a check-in/out — it never looks at `TimeOffRequest` at all. In real payroll, **approved paid leave (e.g. Annual Leave) should count as a paid day**, while only unpaid/LOP leave should reduce pay. Right now:
- An employee who took 5 days of *approved, paid* annual leave in August has no attendance record for those 5 days, so `getWorkedDaysForPeriod` doesn't count them as worked — for the "Contract Staff Salary" structure (which prorates `CONTRACT_WAGE * WORKED_DAYS / 30`), that employee is effectively **underpaid** for taking approved leave they were entitled to.
- Conversely, there's no distinction for genuinely unpaid leave either — the system can't currently tell the difference between "on approved paid leave" and "just didn't show up," because it doesn't consult leave data at all.

This is a real gap between the implemented engine and the PS's own stated integration point ("leave balances depend on allocations and approved requests ... payroll must transform all of that into understandable payslips"). It's not a small fix — it needs `getWorkedDaysForPeriod` (or the caller in `payruns.ts` compute) to also pull approved `TimeOffRequest`s in the period, cross-reference each leave type's payroll-integration flag (the `TimeOffType.payrollIntegrated` field already exists for exactly this), and add those days to the paid-day count. Recommend doing this as a deliberate follow-up rather than a rushed patch, since it changes real payslip numbers.

### 3. "Regular Salary" structure ignores worked days entirely; "Contract Staff Salary" prorates by a flat `/30`

The two seeded structures handle attendance completely differently:
- **Regular Salary** (permanent staff): `Basic Salary = CONTRACT_WAGE` — flat, full pay regardless of attendance. This is actually *defensible* real-world behavior for salaried employees (salary isn't usually docked per absence unless there's an LOP policy) — not necessarily a bug.
- **Contract Staff Salary**: `Basic Salary = CONTRACT_WAGE * WORKED_DAYS / 30` — prorated, but against a flat calendar-day denominator (30) rather than the employee's actual working-schedule days for that month (which varies: 28–31 calendar days, and weekly-off days should arguably be excluded). Combined with finding #2, contract staff are the ones most exposed to being shorted for approved leave.

Not a bug per se — just worth knowing the two structures encode two different (and not fully consistent) payroll philosophies, and the `/30` denominator is a simplification, not derived from the assigned Working Schedule.

### 4. Contract period doesn't get prorated for mid-period joiners/leavers

`getActiveContractForPeriod` finds *a* contract that overlaps the payrun period, but if an employee joined on, say, August 15th (contract `startDate` mid-period), the full-month wage/worked-days logic still runs across the whole period — there's no proration for a partial-period contract. A new joiner who worked half of August would still be processed against the whole period's worked-days count, not scaled to their actual tenure within it. This is common in real payroll (first/last month proration) and isn't handled here.

### 5. Statutory deductions are illustrative, not compliant — expected, not flagged as urgent

PF is modeled as a flat 12%/8% of Basic/Gross with no wage ceiling (real EPFO rules cap the PF-eligible basic at ₹15,000/month), there's no ESI, and "Tax" is a simplified slab-free `GROSS > 50000 ? 10% : 0` rule rather than real income-tax slabs. This is fine for a hackathon demo — the PS explicitly says the focus is business logic and data relationships, not statutory accuracy — but noting it so it's not mistaken for a bug.

### 6. Negative net salary isn't guarded against

If a salary rule chain (especially custom formula rules) produces deductions exceeding gross, nothing flags or blocks a negative `netSalary` — it would just print/pay a negative number. Real systems typically floor net pay at 0 and raise a hard error/warning instead. Low likelihood with the seeded rules, but a gap in the generic rule engine.

---

## Recommendation

Priority order if you want to close more of these:
1. **#2 (leave-aware worked days)** — the most PS-relevant gap left (ties allocations/requests to payroll, which the PS calls out by name) and the most real-world-impactful.
2. **#6 (negative net salary guard)** — cheap, low-risk defensive fix.
3. **#4 (mid-period contract proration)** — more involved, matches "period-based contract handling" language in the PS but is a bigger change to the compute formula's day-counting.
4. **#3 (schedule-aware working-day denominator)** — nice-to-have, would make the `/30` proration genuinely date-accurate.
5. **#5 (statutory accuracy)** — explicitly out of scope per the PS itself; only worth doing if you want the demo to look more India-payroll-realistic.
