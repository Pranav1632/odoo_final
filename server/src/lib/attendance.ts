import { prisma } from './prisma';

export async function getWorkedDaysForPeriod(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const records = await prisma.attendance.findMany({
    where: {
      employeeId,
      checkIn: { gte: periodStart, lte: periodEnd },
      workedHours: { not: null },
    },
    select: { workedHours: true },
  });

  // Count distinct calendar days with at least 4 worked hours as a "day"
  return records.filter((r) => (r.workedHours ?? 0) >= 4).length;
}
