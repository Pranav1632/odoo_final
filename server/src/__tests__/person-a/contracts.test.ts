import { getActiveContractForPeriod } from '../../lib/contractUtils';

describe('getActiveContractForPeriod', () => {
  const periodStart = new Date('2026-01-01');
  const periodEnd = new Date('2026-01-31');

  test('returns active contract when employee has one expired and one active', () => {
    const contracts = [
      {
        id: 'c1',
        employeeId: 'emp1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-10-31'),
        status: 'expired',
      },
      {
        id: 'c2',
        employeeId: 'emp1',
        startDate: new Date('2025-11-01'),
        endDate: null,
        status: 'active',
      },
    ];

    const result = getActiveContractForPeriod(contracts, periodStart, periodEnd);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('c2');
  });

  test('returns null when employee has only an expired contract', () => {
    const contracts = [
      {
        id: 'c1',
        employeeId: 'emp1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-10-31'),
        status: 'expired',
      },
    ];

    const result = getActiveContractForPeriod(contracts, periodStart, periodEnd);
    expect(result).toBeNull();
  });

  test('returns matching active contract when employee has multiple active non-overlapping contracts', () => {
    const contracts = [
      {
        id: 'c1',
        employeeId: 'emp1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30'),
        status: 'active',
      },
      {
        id: 'c2',
        employeeId: 'emp1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'active',
      },
    ];

    const result = getActiveContractForPeriod(contracts, periodStart, periodEnd);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('c2');
  });
});
