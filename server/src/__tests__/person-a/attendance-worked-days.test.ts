/**
 * Unit tests for getWorkedDaysForPeriod (src/lib/attendance.ts).
 *
 * Covers:
 *  1. Zero attendance + zero leave -> 0 (regression guard for the old
 *     hardcoded-30 fallback bug — must never silently pay a full month).
 *  2. Attendance-only counting still works as before (>=4 worked hours = a day,
 *     half-days excluded).
 *  3. Approved, payroll-integrated, day-unit leave adds paid days on top of
 *     attendance.
 *  4. Leave overlapping the period boundary is clipped to the period.
 *  5. A day covered by both attendance and leave is not double-counted.
 *  6. The query sent to timeOffRequest.findMany actually filters for
 *     approved / payrollIntegrated / day-unit — locking in the business rule
 *     at the query level, not just in the post-processing arithmetic.
 */
import { getWorkedDaysForPeriod } from '../../lib/attendance';

const attendanceFindMany = jest.fn();
const timeOffRequestFindMany = jest.fn();

jest.mock('../../lib/prisma', () => ({
  prisma: {
    attendance: { findMany: (...args: any[]) => attendanceFindMany(...args) },
    timeOffRequest: { findMany: (...args: any[]) => timeOffRequestFindMany(...args) },
  },
}));

const periodStart = new Date('2026-08-01T00:00:00.000Z');
const periodEnd = new Date('2026-08-31T00:00:00.000Z');

beforeEach(() => {
  attendanceFindMany.mockReset();
  timeOffRequestFindMany.mockReset();
  attendanceFindMany.mockResolvedValue([]);
  timeOffRequestFindMany.mockResolvedValue([]);
});

describe('getWorkedDaysForPeriod', () => {
  test('returns 0 (not a hardcoded fallback) when there is no attendance and no qualifying leave', async () => {
    const result = await getWorkedDaysForPeriod('emp-1', periodStart, periodEnd);
    expect(result).toBe(0);
  });

  test('counts distinct qualifying attendance days, excluding half-days', async () => {
    attendanceFindMany.mockResolvedValue([
      { checkIn: new Date('2026-08-01T09:00:00Z'), workedHours: 8 },
      { checkIn: new Date('2026-08-02T09:00:00Z'), workedHours: 4 },
      { checkIn: new Date('2026-08-03T09:00:00Z'), workedHours: 2 }, // below 4h threshold
    ]);
    const result = await getWorkedDaysForPeriod('emp-1', periodStart, periodEnd);
    expect(result).toBe(2);
  });

  test('adds approved, payroll-integrated leave days on top of attendance', async () => {
    attendanceFindMany.mockResolvedValue([
      { checkIn: new Date('2026-08-01T09:00:00Z'), workedHours: 8 },
      { checkIn: new Date('2026-08-02T09:00:00Z'), workedHours: 8 },
    ]);
    timeOffRequestFindMany.mockResolvedValue([
      { startDate: new Date('2026-08-10T00:00:00Z'), endDate: new Date('2026-08-12T00:00:00Z') }, // 3 days
    ]);
    const result = await getWorkedDaysForPeriod('emp-1', periodStart, periodEnd);
    expect(result).toBe(5); // 2 attendance + 3 leave
  });

  test('clips a leave request that spans the period boundary to only the days inside the period', async () => {
    timeOffRequestFindMany.mockResolvedValue([
      // spans July 29 - Aug 2; only Aug 1 and Aug 2 fall inside this period
      { startDate: new Date('2026-07-29T00:00:00Z'), endDate: new Date('2026-08-02T00:00:00Z') },
    ]);
    const result = await getWorkedDaysForPeriod('emp-1', periodStart, periodEnd);
    expect(result).toBe(2);
  });

  test('does not double-count a calendar day covered by both attendance and leave', async () => {
    attendanceFindMany.mockResolvedValue([
      { checkIn: new Date('2026-08-05T09:00:00Z'), workedHours: 8 },
    ]);
    timeOffRequestFindMany.mockResolvedValue([
      { startDate: new Date('2026-08-05T00:00:00Z'), endDate: new Date('2026-08-05T00:00:00Z') },
    ]);
    const result = await getWorkedDaysForPeriod('emp-1', periodStart, periodEnd);
    expect(result).toBe(1);
  });

  test('queries only approved, payroll-integrated, day-unit leave types', async () => {
    await getWorkedDaysForPeriod('emp-1', periodStart, periodEnd);
    expect(timeOffRequestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employeeId: 'emp-1',
          status: 'approved',
          type: { payrollIntegrated: true, unit: 'days' },
        }),
      })
    );
  });
});
