/**
 * Security integration tests for all Person B routes.
 * Uses supertest against the real Express app (no live DB — Prisma is mocked).
 *
 * Tests every RBAC rule from MASTER_BUILD_SPEC.md Section 5 for:
 *  - Salary Structure routes
 *  - Salary Rule routes
 *  - Payrun routes
 *  - Payslip routes (including EMPLOYEE isolation)
 *  - Payrun lifecycle status gates
 *  - Input validation
 *  - No-token / malformed-token → 401
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Environment setup
// ---------------------------------------------------------------------------
const JWT_SECRET = 'test-secret-min-32-chars-for-security-tests';
process.env.JWT_SECRET = JWT_SECRET;

function makeToken(role: string, employeeId?: string, userId?: string) {
  return jwt.sign(
    {
      userId: userId ?? `user-${role}`,
      email: `${role}@test.com`,
      role,
      ...(employeeId ? { employeeId } : {}),
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const employeeToken = makeToken('EMPLOYEE', 'emp-A', 'user-emp-A');
const hrManagerToken = makeToken('HR_MANAGER');
const payrollUserToken = makeToken('HR_PAYROLL_USER');
const payrollManagerToken = makeToken('HR_PAYROLL_MANAGER');
const adminToken = makeToken('ADMIN');

// empB is a different employee
const empBToken = makeToken('EMPLOYEE', 'emp-B', 'user-emp-B');

// IDs used in tests
const structureId = 'structure-1';
const existingPayrunId = 'payrun-existing';
const draftPayrunId = 'payrun-draft';
const computedPayrunId = 'payrun-computed';
const paidPayrunId = 'payrun-paid';
const validatedPayrunId = 'payrun-validated';
const empAPayslipId = 'payslip-emp-A';

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
// Mock Prisma
// ---------------------------------------------------------------------------
jest.mock('../../src/lib/prisma', () => {
  const structure = { id: 'structure-1', name: 'Regular', rules: [], _count: { rules: 0, contracts: 0 } };
  const rule = { id: 'rule-1', structureId: 'structure-1', name: 'Basic', code: 'BASIC', category: 'Basic', sequence: 1, computationMethod: 'fixed', amount: 30000, percentageOf: null, percentageValue: null, formula: null };

  const payslipEmpA = {
    id: 'payslip-emp-A',
    payrunId: 'payrun-existing',
    employeeId: 'emp-A',
    employee: { id: 'emp-A', name: 'Emp A', department: 'Eng' },
    payrun: { id: 'payrun-existing', name: 'PR1', periodStart: new Date(), periodEnd: new Date() },
    contractId: 'c1',
    workedDays: 30,
    status: 'computed',
    warnings: [],
    netSalary: 30000,
    lines: [],
  };

  const makeMockPayrun = (status: string) => ({
    id: `payrun-${status}`,
    name: `Payrun ${status}`,
    periodStart: new Date('2026-07-01'),
    periodEnd: new Date('2026-07-31'),
    salaryStructureId: 'structure-1',
    status,
    salaryStructure: { id: 'structure-1', name: 'Regular', rules: [] },
    payslips: [],
    _count: { payslips: 0 },
  });

  return {
    prisma: {
      salaryStructure: {
        findMany: jest.fn().mockResolvedValue([structure]),
        findUnique: jest.fn().mockResolvedValue(structure),
        create: jest.fn().mockResolvedValue({ ...structure, id: 'new-structure' }),
        update: jest.fn().mockResolvedValue(structure),
        delete: jest.fn().mockResolvedValue(structure),
      },
      salaryRule: {
        findMany: jest.fn().mockResolvedValue([rule]),
        findUnique: jest.fn().mockResolvedValue(rule),
        create: jest.fn().mockResolvedValue({ ...rule, id: 'new-rule' }),
        update: jest.fn().mockResolvedValue(rule),
        delete: jest.fn().mockResolvedValue(rule),
      },
      payrun: {
        findMany: jest.fn().mockResolvedValue([makeMockPayrun('draft')]),
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
          const statusMap: Record<string, string> = {
            'payrun-existing': 'computed',
            'payrun-draft': 'draft',
            'payrun-computed': 'computed',
            'payrun-paid': 'paid',
            'payrun-validated': 'validated',
          };
          const status = statusMap[where.id] ?? 'draft';
          return Promise.resolve({
            ...makeMockPayrun(status),
            id: where.id,
          });
        }),
        create: jest.fn().mockResolvedValue(makeMockPayrun('draft')),
        update: jest.fn().mockResolvedValue(makeMockPayrun('draft')),
      },
      payslip: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
          if (where.id === 'payslip-emp-A') return Promise.resolve(payslipEmpA);
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue(payslipEmpA),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue(payslipEmpA),
      },
      payslipLine: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      employee: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      errorLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockImplementation(async (fnOrArray) => {
        if (typeof fnOrArray === 'function') {
          return fnOrArray({
            payslipLine: { deleteMany: jest.fn(), createMany: jest.fn() },
            payslip: { update: jest.fn() },
            payrun: { update: jest.fn() },
          });
        }
        return Promise.all(fnOrArray);
      }),
    },
  };
});

jest.mock('../../src/lib/contracts', () => ({
  getActiveContractForPeriod: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../src/lib/attendance', () => ({
  getWorkedDaysForPeriod: jest.fn().mockResolvedValue(30),
}));

const app = createApp();

// ---------------------------------------------------------------------------
// Salary Structure — role enforcement
// ---------------------------------------------------------------------------
describe('Salary Structure — role enforcement', () => {
  test('EMPLOYEE: GET /api/salary-structures → 403', async () => {
    const res = await request(app).get('/api/salary-structures').set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  test('HR_MANAGER: GET /api/salary-structures → 403', async () => {
    const res = await request(app).get('/api/salary-structures').set('Authorization', `Bearer ${hrManagerToken}`);
    expect(res.status).toBe(403);
  });

  test('HR_PAYROLL_USER: GET /api/salary-structures → 200 (read allowed)', async () => {
    const res = await request(app).get('/api/salary-structures').set('Authorization', `Bearer ${payrollUserToken}`);
    expect(res.status).toBe(200);
  });

  test('HR_PAYROLL_USER: POST /api/salary-structures → 403 (no write)', async () => {
    const res = await request(app).post('/api/salary-structures').set('Authorization', `Bearer ${payrollUserToken}`).send({ name: 'X' });
    expect(res.status).toBe(403);
  });

  test('HR_MANAGER: POST /api/salary-structures → 403', async () => {
    const res = await request(app).post('/api/salary-structures').set('Authorization', `Bearer ${hrManagerToken}`).send({ name: 'X' });
    expect(res.status).toBe(403);
  });

  test('HR_PAYROLL_MANAGER: POST /api/salary-structures → 201', async () => {
    const res = await request(app).post('/api/salary-structures').set('Authorization', `Bearer ${payrollManagerToken}`).send({ name: 'New Structure' });
    expect(res.status).toBe(201);
  });

  test('HR_PAYROLL_MANAGER: PATCH /api/salary-structures/:id → 200', async () => {
    const res = await request(app).patch(`/api/salary-structures/${structureId}`).set('Authorization', `Bearer ${payrollManagerToken}`).send({ name: 'Updated' });
    expect(res.status).toBe(200);
  });

  test('HR_PAYROLL_USER: PATCH /api/salary-structures/:id → 403', async () => {
    const res = await request(app).patch(`/api/salary-structures/${structureId}`).set('Authorization', `Bearer ${payrollUserToken}`).send({ name: 'Updated' });
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Salary Rule — role enforcement
// ---------------------------------------------------------------------------
describe('Salary Rule — role enforcement', () => {
  test('EMPLOYEE: GET /api/salary-rules → 403', async () => {
    const res = await request(app).get('/api/salary-rules').set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  test('HR_MANAGER: POST /api/salary-rules → 403', async () => {
    const res = await request(app).post('/api/salary-rules').set('Authorization', `Bearer ${hrManagerToken}`).send({});
    expect(res.status).toBe(403);
  });

  test('HR_PAYROLL_USER: POST /api/salary-rules → 403 (read-only)', async () => {
    const res = await request(app).post('/api/salary-rules').set('Authorization', `Bearer ${payrollUserToken}`).send({});
    expect(res.status).toBe(403);
  });

  test('HR_PAYROLL_MANAGER: POST /api/salary-rules with valid body → 201', async () => {
    const res = await request(app)
      .post('/api/salary-rules')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({
        structureId,
        name: 'Test',
        code: 'TEST',
        category: 'Basic',
        sequence: 99,
        computationMethod: 'fixed',
        amount: 1000,
      });
    expect(res.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// Payrun — role enforcement
// ---------------------------------------------------------------------------
describe('Payrun — role enforcement', () => {
  test('EMPLOYEE: GET /api/payruns → 403', async () => {
    const res = await request(app).get('/api/payruns').set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  test('HR_MANAGER: POST /api/payruns → 403', async () => {
    const res = await request(app).post('/api/payruns').set('Authorization', `Bearer ${hrManagerToken}`).send({});
    expect(res.status).toBe(403);
  });

  test('HR_MANAGER: POST /api/payruns/:id/compute → 403', async () => {
    const res = await request(app).post(`/api/payruns/${existingPayrunId}/compute`).set('Authorization', `Bearer ${hrManagerToken}`);
    expect(res.status).toBe(403);
  });

  test('HR_PAYROLL_USER: POST /api/payruns/:id/validate → 403 (only MANAGER can validate)', async () => {
    const res = await request(app).post(`/api/payruns/${existingPayrunId}/validate`).set('Authorization', `Bearer ${payrollUserToken}`);
    expect(res.status).toBe(403);
  });

  test('HR_PAYROLL_USER: POST /api/payruns/:id/mark-paid → 403', async () => {
    const res = await request(app).post(`/api/payruns/${existingPayrunId}/mark-paid`).set('Authorization', `Bearer ${payrollUserToken}`);
    expect(res.status).toBe(403);
  });

  test('HR_PAYROLL_USER: POST /api/payruns/:id/send-payslips → 403', async () => {
    const res = await request(app).post(`/api/payruns/${existingPayrunId}/send-payslips`).set('Authorization', `Bearer ${payrollUserToken}`);
    expect(res.status).toBe(403);
  });

  test('ADMIN: GET /api/payruns → 200', async () => {
    const res = await request(app).get('/api/payruns').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Payslip — employee data isolation
// ---------------------------------------------------------------------------
describe('Payslip — employee data isolation', () => {
  test('EMPLOYEE: GET /api/payslips/:id for own payslip → 200', async () => {
    const res = await request(app).get(`/api/payslips/${empAPayslipId}`).set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(200);
  });

  test('EMPLOYEE: GET /api/payslips/:id for another employee payslip → 403', async () => {
    const res = await request(app).get(`/api/payslips/${empAPayslipId}`).set('Authorization', `Bearer ${empBToken}`);
    expect(res.status).toBe(403);
  });

  test('EMPLOYEE: GET /api/payslips/:id/pdf for another employee → 403', async () => {
    const res = await request(app).get(`/api/payslips/${empAPayslipId}/pdf`).set('Authorization', `Bearer ${empBToken}`);
    expect(res.status).toBe(403);
  });

  test('HR_PAYROLL_USER: GET /api/payslips/:id → 200 (read all)', async () => {
    const res = await request(app).get(`/api/payslips/${empAPayslipId}`).set('Authorization', `Bearer ${payrollUserToken}`);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Payrun lifecycle — status gate enforcement
// ---------------------------------------------------------------------------
describe('Payrun lifecycle — status gate enforcement', () => {
  test('POST /api/payruns/:id/validate on a "draft" payrun → 400', async () => {
    const res = await request(app).post(`/api/payruns/${draftPayrunId}/validate`).set('Authorization', `Bearer ${payrollManagerToken}`);
    expect(res.status).toBe(400);
  });

  test('POST /api/payruns/:id/mark-paid on a "computed" (not yet validated) payrun → 400', async () => {
    const res = await request(app).post(`/api/payruns/${computedPayrunId}/mark-paid`).set('Authorization', `Bearer ${payrollManagerToken}`);
    expect(res.status).toBe(400);
  });

  test('POST /api/payruns/:id/compute on a "paid" payrun → 400', async () => {
    const res = await request(app).post(`/api/payruns/${paidPayrunId}/compute`).set('Authorization', `Bearer ${payrollManagerToken}`);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
describe('Input validation', () => {
  test('POST /api/salary-rules with computationMethod=formula and no formula → 400', async () => {
    const res = await request(app)
      .post('/api/salary-rules')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({ structureId, name: 'Bad Rule', code: 'BAD', category: 'Basic', sequence: 1, computationMethod: 'formula' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/formula/i);
  });

  test('POST /api/salary-rules with code containing lowercase → 400', async () => {
    const res = await request(app)
      .post('/api/salary-rules')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({ structureId, name: 'Bad', code: 'basic_salary', category: 'Basic', sequence: 1, computationMethod: 'fixed', amount: 1000 });

    expect(res.status).toBe(400);
  });

  test('No auth token on any payroll route → 401', async () => {
    const routes = [
      '/api/salary-structures',
      '/api/salary-rules',
      '/api/payruns',
      '/api/payslips',
    ];
    for (const route of routes) {
      const res = await request(app).get(route);
      expect(res.status).toBe(401);
    }
  });

  test('Malformed token on any payroll route → 401', async () => {
    const res = await request(app)
      .get('/api/salary-structures')
      .set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// BullMQ worker failure — 503 when Redis unreachable
// ---------------------------------------------------------------------------
describe('BullMQ worker failure handling', () => {
  test('POST /api/payruns/:id/send-payslips returns 503 when queue add throws ECONNREFUSED', async () => {
    const { payslipSendQueue } = require('../../src/lib/payroll/queue');
    (payslipSendQueue.add as jest.Mock).mockRejectedValueOnce(
      new Error('connect ECONNREFUSED 127.0.0.1:6379')
    );

    const res = await request(app)
      .post(`/api/payruns/${existingPayrunId}/send-payslips`)
      .set('Authorization', `Bearer ${payrollManagerToken}`);

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/Queue unavailable — Redis is unreachable/i);
  });
});
