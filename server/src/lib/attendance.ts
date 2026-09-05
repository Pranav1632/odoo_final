import { prisma } from './prisma';

/**
 * Returns the number of days an employee worked during a period,
 * derived from their Attendance records (checkIn/checkOut pairs).
 * Returns 30 as a documented fallback when no attendance data exists.
 *
 * Person A owns this implementation — do NOT re-implement in Person B's code.
 */
export async function getWorkedDaysForPeriod(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const records = await prisma.attendance.findMany({
    where: {
      employeeId,
      checkIn: { gte: periodStart, lte: periodEnd },
      checkOut: { not: null },
    },
  });

  if (records.length === 0) {
    // Documented fallback — no attendance data means assume full month
    return 30;
  }

  // Count unique calendar days with a checkIn
  const uniqueDays = new Set(
    records.map((r) => r.checkIn.toISOString().split('T')[0])
  );
  return uniqueDays.size;
}
