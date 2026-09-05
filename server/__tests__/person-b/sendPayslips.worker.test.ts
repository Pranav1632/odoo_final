/**
 * Exercises the send-payslips worker's actual business logic directly
 * (processSendPayslipsJob), bypassing BullMQ/Redis entirely — this environment
 * has no Redis available, so this is the only way to verify the logic that
 * would otherwise only run inside a live queue worker process:
 *  1. Only 'validated' payslips are picked up (not already-'paid' ones —
 *     regression test for the double-send bug).
 *  2. A payslip whose employee has no linked email is skipped and logged
 *     to the error log, without touching its status.
 *  3. A payslip whose employee has an email is marked 'paid' via a single
 *     batched updateMany.
 *  4. An audit log entry is written with the correct sent/total counts.
 */

jest.mock('../../src/lib/payroll/queue', () => ({
  redisConnection: { quit: jest.fn(), disconnect: jest.fn() },
  payslipSendQueue: { add: jest.fn() },
}));

const mockFindMany = jest.fn();
const mockUpdateMany = jest.fn();
const mockAuditLogCreate = jest.fn();
const mockErrorLogCreate = jest.fn();

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    payslip: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
    auditLog: { create: (...args: unknown[]) => mockAuditLogCreate(...args) },
    errorLog: { create: (...args: unknown[]) => mockErrorLogCreate(...args) },
  },
}));

import { processSendPayslipsJob } from '../../src/lib/payroll/workers/sendPayslips';

describe('processSendPayslipsJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('only queries payslips with status "validated" (not already-paid ones)', async () => {
    mockFindMany.mockResolvedValue([]);

    await processSendPayslipsJob({ payrunId: 'payrun-1', requestedByUserId: 'user-1' });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { payrunId: 'payrun-1', status: 'validated' },
      })
    );
  });

  test('sends payslips with an email, skips and logs those without one, and batches the status update', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'payslip-with-email',
        employeeId: 'emp-1',
        employee: { user: { email: 'emp1@peoplepay360.com' } },
      },
      {
        id: 'payslip-without-email',
        employeeId: 'emp-2',
        employee: { user: null },
      },
      {
        id: 'payslip-with-email-2',
        employeeId: 'emp-3',
        employee: { user: { email: 'emp3@peoplepay360.com' } },
      },
    ]);

    const result = await processSendPayslipsJob({
      payrunId: 'payrun-1',
      requestedByUserId: 'user-1',
    });

    expect(result).toEqual({ sent: 2 });

    // Missing-email payslip logged to the error log, identified by employeeId
    expect(mockErrorLogCreate).toHaveBeenCalledTimes(1);
    expect(mockErrorLogCreate.mock.calls[0][0].data.message).toContain('emp-2');

    // Only the two with-email payslips are batched into a single updateMany
    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['payslip-with-email', 'payslip-with-email-2'] } },
      data: { status: 'paid' },
    });
  });

  test('writes an audit log with the correct sent/total counts', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'p1', employeeId: 'e1', employee: { user: { email: 'e1@x.com' } } },
      { id: 'p2', employeeId: 'e2', employee: { user: null } },
    ]);

    await processSendPayslipsJob({ payrunId: 'payrun-9', requestedByUserId: 'user-9' });

    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-9',
          action: 'SEND_PAYSLIPS',
          entityType: 'Payrun',
          entityId: 'payrun-9',
          details: JSON.stringify({ sent: 1, total: 2 }),
        }),
      })
    );
  });

  test('does not call updateMany when nothing was sent', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'p1', employeeId: 'e1', employee: { user: null } },
    ]);

    const result = await processSendPayslipsJob({
      payrunId: 'payrun-1',
      requestedByUserId: 'user-1',
    });

    expect(result).toEqual({ sent: 0 });
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });
});
