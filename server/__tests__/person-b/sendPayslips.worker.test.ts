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

const mockGeneratePdf = jest.fn().mockResolvedValue(Buffer.from('fake-pdf'));
jest.mock('../../src/lib/payroll/generatePdf', () => ({
  generatePayslipPdf: (...args: unknown[]) => mockGeneratePdf(...args),
}));

const mockSendPayslipEmail = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/lib/email', () => ({
  sendPayslipEmail: (...args: unknown[]) => mockSendPayslipEmail(...args),
}));

import { processSendPayslipsJob } from '../../src/lib/payroll/workers/sendPayslips';

// Every payslip fixture needs payrun + lines now that the worker generates a
// real PDF and emails it — these two mocks stand in for the actual SMTP send
// and PDF rendering (both are exercised separately in generatePdf's own
// tests and in the live Mailpit integration check).
const samplePayrun = { name: 'August 2026 Payroll', periodStart: new Date('2026-08-01'), periodEnd: new Date('2026-08-31') };
const sampleLines: unknown[] = [];

describe('processSendPayslipsJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGeneratePdf.mockResolvedValue(Buffer.from('fake-pdf'));
    mockSendPayslipEmail.mockResolvedValue(undefined);
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
        employee: { name: 'Emp One', user: { email: 'emp1@peoplepay360.com' } },
        payrun: samplePayrun,
        lines: sampleLines,
        workedDays: 22,
        netSalary: 50000,
      },
      {
        id: 'payslip-without-email',
        employeeId: 'emp-2',
        employee: { name: 'Emp Two', user: null },
        payrun: samplePayrun,
        lines: sampleLines,
        workedDays: 22,
        netSalary: 48000,
      },
      {
        id: 'payslip-with-email-2',
        employeeId: 'emp-3',
        employee: { name: 'Emp Three', user: { email: 'emp3@peoplepay360.com' } },
        payrun: samplePayrun,
        lines: sampleLines,
        workedDays: 22,
        netSalary: 52000,
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

    // Real send attempted only for the two with-email payslips
    expect(mockSendPayslipEmail).toHaveBeenCalledTimes(2);
    expect(mockSendPayslipEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'emp1@peoplepay360.com', employeeName: 'Emp One', netSalary: 50000 })
    );

    // Only the two with-email payslips are batched into a single updateMany
    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['payslip-with-email', 'payslip-with-email-2'] } },
      data: { status: 'paid' },
    });
  });

  test('a send failure is logged to the error log and does not mark the payslip paid', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'p-ok', employeeId: 'e-ok', employee: { name: 'OK', user: { email: 'ok@x.com' } }, payrun: samplePayrun, lines: sampleLines, workedDays: 22, netSalary: 1000 },
      { id: 'p-fail', employeeId: 'e-fail', employee: { name: 'Fail', user: { email: 'fail@x.com' } }, payrun: samplePayrun, lines: sampleLines, workedDays: 22, netSalary: 1000 },
    ]);
    mockSendPayslipEmail.mockImplementationOnce(() => Promise.resolve()).mockImplementationOnce(() => Promise.reject(new Error('SMTP connection refused')));

    const result = await processSendPayslipsJob({ payrunId: 'payrun-1', requestedByUserId: 'user-1' });

    expect(result).toEqual({ sent: 1 });
    expect(mockErrorLogCreate).toHaveBeenCalledTimes(1);
    expect(mockErrorLogCreate.mock.calls[0][0].data.message).toContain('SMTP connection refused');
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['p-ok'] } },
      data: { status: 'paid' },
    });
  });

  test('writes an audit log with the correct sent/total counts', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'p1', employeeId: 'e1', employee: { name: 'E1', user: { email: 'e1@x.com' } }, payrun: samplePayrun, lines: sampleLines, workedDays: 22, netSalary: 1000 },
      { id: 'p2', employeeId: 'e2', employee: { name: 'E2', user: null }, payrun: samplePayrun, lines: sampleLines, workedDays: 22, netSalary: 1000 },
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
      { id: 'p1', employeeId: 'e1', employee: { name: 'E1', user: null }, payrun: samplePayrun, lines: sampleLines, workedDays: 22, netSalary: 1000 },
    ]);

    const result = await processSendPayslipsJob({
      payrunId: 'payrun-1',
      requestedByUserId: 'user-1',
    });

    expect(result).toEqual({ sent: 0 });
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });
});
