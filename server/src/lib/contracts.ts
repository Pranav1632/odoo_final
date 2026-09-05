import { Contract, SalaryStructure, SalaryRule } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Returns the active contract for an employee that covers a given period.
 * A contract is "active for a period" when:
 *   contract.startDate <= periodEnd  AND  (contract.endDate IS NULL OR contract.endDate >= periodStart)
 *
 * Person A owns this implementation — do NOT re-implement in Person B's code.
 */
export async function getActiveContractForPeriod(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<(Contract & { salaryStructure: SalaryStructure & { rules: SalaryRule[] } }) | null> {
  const contract = await prisma.contract.findFirst({
    where: {
      employeeId,
      startDate: { lte: periodEnd },
      OR: [
        { endDate: null },
        { endDate: { gte: periodStart } },
      ],
      status: 'active',
    },
    include: {
      salaryStructure: {
        include: {
          rules: { orderBy: { sequence: 'asc' } },
        },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  return contract;
}
