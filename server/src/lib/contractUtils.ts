export function findActiveContractForPeriod<T extends { startDate: Date; endDate: Date | null; status: string }>(
  contracts: T[],
  periodStart: Date,
  periodEnd: Date
): T | null {
  const activeContracts = contracts.filter(
    (c) =>
      c.status === 'active' &&
      c.startDate <= periodEnd &&
      (c.endDate === null || c.endDate >= periodStart)
  );

  if (activeContracts.length === 0) return null;

  activeContracts.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  return activeContracts[0];
}
