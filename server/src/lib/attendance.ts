import { prisma } from './prisma';

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Worked days for payroll purposes = distinct calendar days with qualifying
 * attendance, UNIONed with distinct calendar days of approved, payroll-integrated,
 * day-unit leave overlapping the period (clipped to the period boundaries).
 *
 * Hour-unit leave types are intentionally excluded — there is no
 * business-defined "hours per day" conversion for them, and inventing one
 * would just be a different hardcoded value in place of the old one.
 */
export async function getWorkedDaysForPeriod(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const workedDates = new Set<string>();

  // 1. Attendance-derived worked days (at least 4 worked hours counts as a full day)
  const records = await prisma.attendance.findMany({
    where: {
      employeeId,
      checkIn: { gte: periodStart, lte: periodEnd },
      workedHours: { not: null },
    },
    select: { checkIn: true, workedHours: true },
  });
  for (const r of records) {
    if ((r.workedHours ?? 0) >= 4) {
      workedDates.add(toDateKey(r.checkIn));
    }
  }

  // 2. Approved paid leave (payrollIntegrated day-unit types) also counts as a
  //    paid working day — an employee on approved Annual Leave shouldn't be
  //    underpaid by a worked-days calculation that only ever looks at attendance.
  const leaveRequests = await prisma.timeOffRequest.findMany({
    where: {
      employeeId,
      status: 'approved',
      startDate: { lte: periodEnd },
      endDate: { gte: periodStart },
      type: { payrollIntegrated: true, unit: 'days' },
    },
    select: { startDate: true, endDate: true },
  });
  for (const leave of leaveRequests) {
    const clippedStart = startOfUtcDay(
      leave.startDate > periodStart ? leave.startDate : periodStart
    );
    const clippedEnd = startOfUtcDay(leave.endDate < periodEnd ? leave.endDate : periodEnd);
    for (let d = clippedStart; d <= clippedEnd; d = new Date(d.getTime() + 86400000)) {
      workedDates.add(toDateKey(d));
    }
  }

  return workedDates.size;
}
