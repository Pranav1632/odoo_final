import { prisma } from './prisma';

export async function getActiveContractForPeriod(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date
) {
  return prisma.contract.findFirst({
    where: {
      employeeId,
      status: 'active',
      startDate: { lte: periodEnd },
      OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
    },
    orderBy: { startDate: 'desc' },
    include: {
      salaryStructure: {
        include: { rules: { orderBy: { sequence: 'asc' } } },
      },
    },
  });
}
