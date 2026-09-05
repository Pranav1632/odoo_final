/**
 * Integration tests for the payrun compute flow and salary rule input validation.
 *
 * These tests mock Prisma so they run without a live database.
 * The key behaviours tested:
 *  1. POST /api/payruns/:id/compute skips employees with no active contract
 *     and records the correct warning — without failing the whole batch.
 *  2. After changing a SalaryRule's amount and recomputing, the returned
 *     netSalary differs from the previous value (the live-demo requirement).
 *  3. POST /api/salary-rules with computationMethod=formula and no formula → 400
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// JWT helpers — generate test tokens without hitting a real auth route
// ---------------------------------------------------------------------------
const JWT_SECRET = 'test-secret-min-32-chars-for-tests-ok';
process.env.JWT_SECRET = JWT_SECRET;

function makeToken(role: string, employeeId?: string) {
  return jwt.sign(
    { userId: `user-${role}`, email: `${role}@test.com`, role, employeeId },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const payrollManagerToken = makeToken('HR_PAYROLL_MANAGER');
const payrollUserToken = makeToken('HR_PAYROLL_USER');

// ---------------------------------------------------------------------------
// Mock Queue & Redis
// ---------------------------------------------------------------------------
jest.mock('../../src/lib/payroll/queue', () => ({
  redisConnection: { quit: jest.fn(), disconnect: jest.fn() },
  payslipSendQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  },
}));

// ---------------------------------------------------------------------------
// Mock Prisma — avoids needing a live DB for integration tests
// ---------------------------------------------------------------------------
jest.mock('../../src/lib/prisma', () => {
  const mockSalaryRule = {
    id: 'rule-1',
    structureId: 'structure-1',
    name: 'Basic',
    code: 'BASIC',
    category: 'Basic',
    sequence: 1,
    computationMethod: 'fixed',
    amount: 30000,
    percentageOf: null,
    percentageValue: null,
    formula: null,
  };

  const mockStructure = {
    id: 'structure-1',
    name: 'Regular',
    rules: [mockSalaryRule],
  };

  const mockEmployee = {
    id: 'emp-1',
    name: 'Test Employee',
    department: 'Engineering',
    bankAccountNumber: '1234567890',
  };

  const mockPayslip = {
    id: 'payslip-1',
    payrunId: 'payrun-1',
    employeeId: 'emp-1',
    employee: { ...mockEmployee, bankAccountNumber: '1234567890' },
    contractId: 'contract-1',
    workedDays: 0,
    status: 'draft',
    warnings: [],
    netSalary: null,
    lines: [],
  };

  const mockPayrun = {
    id: 'payrun-1',
    name: 'Test Payrun',
    periodStart: new Date('2026-07-01'),
    periodEnd: new Date('2026-07-31'),
    salaryStructureId: 'structure-1',
    status: 'draft',
    salaryStructure: mockStructure,
    payslips: [mockPayslip],
  };

  const mockPayslipUpdate = jest.fn().mockImplementation((args: any) =>
    Promise.resolve({ ...mockPayslip, ...args?.data })
  );

  return {
    prisma: {
      payrun: {
        findUnique: jest.fn().mockResolvedValue(mockPayrun),
        update: jest.fn().mockResolvedValue({ ...mockPayrun, status: 'computed' }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      payslip: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: mockPayslipUpdate,
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      payslipLine: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      salaryStructure: {
        findUnique: jest.fn().mockResolvedValue(mockStructure),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      salaryRule: {
        findUnique: jest.fn().mockResolvedValue(mockSalaryRule),
        findMany: jest.fn().mockResolvedValue([mockSalaryRule]),
        create: jest.fn().mockResolvedValue({ ...mockSalaryRule, id: 'new-rule' }),
        update: jest.fn().mockResolvedValue(mockSalaryRule),
        delete: jest.fn(),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      errorLog: { create: jest.fn().mockResolvedValue({}) },
      employee: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn().mockImplementation(async (fnOrArray) => {
        if (typeof fnOrArray === 'function') {
          return fnOrArray({
            payslipLine: { deleteMany: jest.fn(), createMany: jest.fn() },
            payslip: { update: mockPayslipUpdate },
            payrun: { update: jest.fn() },
          });
        }
        return Promise.all(fnOrArray);
      }),
    },
  };
});

// Mock getActiveContractForPeriod and getWorkedDaysForPeriod
jest.mock('../../src/lib/contracts', () => ({
  getActiveContractForPeriod: jest.fn().mockResolvedValue({
    id: 'contract-1',
    wage: 30000,
    salaryStructure: {
      id: 'structure-1',
      name: 'Regular',
      rules: [
        {
          id: 'rule-1',
          code: 'BASIC',
          name: 'Basic',
          category: 'Basic',
          sequence: 1,
          computationMethod: 'fixed',
          amount: 30000,
          percentageOf: null,
          percentageValue: null,
          formula: null,
        },
        {
          id: 'rule-net',
          code: 'NET',
          name: 'Net Salary',
          category: 'Net',
          sequence: 99,
          computationMethod: 'formula',
          formula: 'BASIC',
          percentageOf: null,
          percentageValue: null,
          amount: null,
        },
      ],
    },
  }),
}));

jest.mock('../../src/lib/attendance', () => ({
  getWorkedDaysForPeriod: jest.fn().mockResolvedValue(30),
}));

const app = createApp();

// ---------------------------------------------------------------------------
// Test: input validation on salary rules POST
// ---------------------------------------------------------------------------
describe('Salary Rule — input validation', () => {
  test('POST /api/salary-rules with computationMethod=formula and no formula → 400', async () => {
    const res = await request(app)
      .post('/api/salary-rules')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({
        structureId: 'structure-1',
        name: 'Bad Rule',
        code: 'BAD',
        category: 'Basic',
        sequence: 1,
        computationMethod: 'formula',
        // formula intentionally omitted
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/formula/i);
  });

  test('POST /api/salary-rules with code containing lowercase → 400', async () => {
    const res = await request(app)
      .post('/api/salary-rules')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({
        structureId: 'structure-1',
        name: 'Bad',
        code: 'basic_salary',
        category: 'Basic',
        sequence: 1,
        computationMethod: 'fixed',
        amount: 1000,
      });

    expect(res.status).toBe(400);
  });

  test('PATCH /api/salary-rules/:id changing computationMethod to formula without formula → 400', async () => {
    const res = await request(app)
      .patch('/api/salary-rules/rule-1')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({
        computationMethod: 'formula',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/formula/i);
  });
});

// ---------------------------------------------------------------------------
// Test: compute skips employees with no active contract
// ---------------------------------------------------------------------------
describe('Payrun compute — contract resolution', () => {
  test('compute skips payslip when no active contract found, records warning', async () => {
    // Override getActiveContractForPeriod to return null for this test
    const { getActiveContractForPeriod } = require('../../src/lib/contracts');
    (getActiveContractForPeriod as jest.Mock).mockResolvedValueOnce(null);

    const { prisma } = require('../../src/lib/prisma');
    (prisma.payslip.update as jest.Mock).mockResolvedValueOnce({
      id: 'payslip-1',
      warnings: ['no active contract for period — payslip skipped'],
      status: 'draft',
    });

    const res = await request(app)
      .post('/api/payruns/payrun-1/compute')
      .set('Authorization', `Bearer ${payrollUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(1);
    expect(res.body.computed).toBe(0);

    // Verify the payslip was updated with the skipped warning
    const updateCall = (prisma.payslip.update as jest.Mock).mock.calls.find(
      (call) => call[0]?.data?.warnings?.some((w: string) => w.includes('no active contract'))
    );
    expect(updateCall).toBeDefined();
  });

  test('compute succeeds and returns netSalary when contract exists', async () => {
    const { getActiveContractForPeriod } = require('../../src/lib/contracts');
    (getActiveContractForPeriod as jest.Mock).mockResolvedValueOnce({
      id: 'contract-1',
      wage: 30000,
      salaryStructure: {
        rules: [
          {
            code: 'BASIC',
            name: 'Basic',
            category: 'Basic',
            sequence: 1,
            computationMethod: 'fixed',
            amount: 30000,
          },
          {
            code: 'NET',
            name: 'Net',
            category: 'Net',
            sequence: 99,
            computationMethod: 'formula',
            formula: 'BASIC',
          },
        ],
      },
    });

    const res = await request(app)
      .post('/api/payruns/payrun-1/compute')
      .set('Authorization', `Bearer ${payrollUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.computed).toBe(1);
    expect(res.body.skipped).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test: live-rule-edit — recompute after rule change shows different netSalary
// ---------------------------------------------------------------------------
describe('Live rule edit — recompute produces different netSalary', () => {
  test('changing BASIC amount from 30000 to 35000 and recomputing gives higher net', async () => {
    const { getActiveContractForPeriod } = require('../../src/lib/contracts');

    // First compute: BASIC=30000, NET=30000
    (getActiveContractForPeriod as jest.Mock).mockResolvedValueOnce({
      id: 'contract-1',
      wage: 30000,
      salaryStructure: {
        rules: [
          { code: 'BASIC', name: 'Basic', category: 'Basic', sequence: 1, computationMethod: 'fixed', amount: 30000 },
          { code: 'NET', name: 'Net', category: 'Net', sequence: 99, computationMethod: 'formula', formula: 'BASIC' },
        ],
      },
    });

    const res1 = await request(app)
      .post('/api/payruns/payrun-1/compute')
      .set('Authorization', `Bearer ${payrollUserToken}`);
    expect(res1.status).toBe(200);
    expect(res1.body.computed).toBe(1);

    // Capture netSalary written to DB on first compute
    const { prisma } = require('../../src/lib/prisma');
    const updateCalls1 = (prisma.payslip.update as jest.Mock).mock.calls.filter(
      (c: any) => c[0]?.data?.netSalary !== undefined
    );
    expect(updateCalls1.length).toBeGreaterThanOrEqual(1);
    const firstNetSalary = updateCalls1[updateCalls1.length - 1][0].data.netSalary;
    expect(firstNetSalary).toBe(30000);

    // Second compute: BASIC=35000, NET=35000 (rule was edited)
    (getActiveContractForPeriod as jest.Mock).mockResolvedValueOnce({
      id: 'contract-1',
      wage: 35000,
      salaryStructure: {
        rules: [
          { code: 'BASIC', name: 'Basic', category: 'Basic', sequence: 1, computationMethod: 'fixed', amount: 35000 },
          { code: 'NET', name: 'Net', category: 'Net', sequence: 99, computationMethod: 'formula', formula: 'BASIC' },
        ],
      },
    });

    const res2 = await request(app)
      .post('/api/payruns/payrun-1/compute')
      .set('Authorization', `Bearer ${payrollUserToken}`);
    expect(res2.status).toBe(200);
    expect(res2.body.computed).toBe(1);

    // Capture netSalary written to DB on second compute and verify it changed
    const updateCalls2 = (prisma.payslip.update as jest.Mock).mock.calls.filter(
      (c: any) => c[0]?.data?.netSalary !== undefined
    );
    expect(updateCalls2.length).toBeGreaterThan(updateCalls1.length);
    const secondNetSalary = updateCalls2[updateCalls2.length - 1][0].data.netSalary;
    expect(secondNetSalary).toBe(35000);
    expect(secondNetSalary).toBeGreaterThan(firstNetSalary);

    // The delete-and-recreate lines pattern was exercised (transaction called twice)
    expect((prisma.$transaction as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Test: validate status gate
// ---------------------------------------------------------------------------
describe('Payrun validate — status gate', () => {
  test('validate on a draft payrun → 400', async () => {
    const { prisma } = require('../../src/lib/prisma');
    (prisma.payrun.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'payrun-draft',
      status: 'draft',
      payslips: [],
    });

    const res = await request(app)
      .post('/api/payruns/payrun-draft/validate')
      .set('Authorization', `Bearer ${payrollManagerToken}`);

    expect(res.status).toBe(400);
  });

  test('mark-paid on a computed (not validated) payrun → 400', async () => {
    const { prisma } = require('../../src/lib/prisma');
    (prisma.payrun.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'payrun-computed',
      status: 'computed',
      payslips: [],
    });

    const res = await request(app)
      .post('/api/payruns/payrun-computed/mark-paid')
      .set('Authorization', `Bearer ${payrollManagerToken}`);

    expect(res.status).toBe(400);
  });

  test('compute on a paid payrun → 400', async () => {
    const { prisma } = require('../../src/lib/prisma');
    (prisma.payrun.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'payrun-paid',
      status: 'paid',
      salaryStructure: { rules: [] },
      payslips: [],
    });

    const res = await request(app)
      .post('/api/payruns/payrun-paid/compute')
      .set('Authorization', `Bearer ${payrollUserToken}`);

    expect(res.status).toBe(400);
  });
});
