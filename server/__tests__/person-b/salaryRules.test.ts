/**
 * Dedicated regression and integration tests for Salary Rule endpoints.
 * Specifically tests validation on POST and PATCH (merge-and-revalidate behavior).
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-min-32-chars-for-salary-rules-test';
process.env.JWT_SECRET = JWT_SECRET;

function makeToken(role: string) {
  return jwt.sign(
    { userId: `user-${role}`, email: `${role}@test.com`, role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const payrollManagerToken = makeToken('HR_PAYROLL_MANAGER');
const payrollUserToken = makeToken('HR_PAYROLL_USER');

// Mock Queue & Redis to avoid hanging connections
jest.mock('../../src/lib/payroll/queue', () => ({
  redisConnection: { quit: jest.fn(), disconnect: jest.fn() },
  payslipSendQueue: { add: jest.fn() },
}));

// Mock Prisma
const mockStructure = { id: 'structure-1', name: 'Regular' };

const initialRule = {
  id: 'rule-fixed',
  structureId: 'structure-1',
  name: 'Basic Pay',
  code: 'BASIC',
  category: 'Basic',
  sequence: 1,
  computationMethod: 'fixed',
  amount: 30000,
  percentageOf: null,
  percentageValue: null,
  formula: null,
};

let currentRuleState = { ...initialRule };

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    salaryStructure: {
      findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === 'structure-1') return Promise.resolve(mockStructure);
        return Promise.resolve(null);
      }),
    },
    salaryRule: {
      findMany: jest.fn().mockImplementation(() => Promise.resolve([currentRuleState])),
      findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === currentRuleState.id) return Promise.resolve({ ...currentRuleState });
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data }: { data: any }) =>
        Promise.resolve({ id: 'rule-new', ...data })
      ),
      update: jest.fn().mockImplementation(({ where, data }: { where: { id: string }; data: any }) => {
        currentRuleState = { ...currentRuleState, ...data };
        return Promise.resolve(currentRuleState);
      }),
      delete: jest.fn().mockResolvedValue({}),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    errorLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

const app = createApp();

describe('Salary Rules — GET endpoints', () => {
  beforeEach(() => {
    currentRuleState = { ...initialRule };
  });

  test('GET /api/salary-rules returns list of rules', async () => {
    const res = await request(app)
      .get('/api/salary-rules?structureId=structure-1')
      .set('Authorization', `Bearer ${payrollUserToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].code).toBe('BASIC');
  });

  test('GET /api/salary-rules/:id returns single rule', async () => {
    const res = await request(app)
      .get('/api/salary-rules/rule-fixed')
      .set('Authorization', `Bearer ${payrollUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('rule-fixed');
    expect(res.body.name).toBe('Basic Pay');
  });

  test('GET /api/salary-rules/:id returns 404 for non-existent rule', async () => {
    const res = await request(app)
      .get('/api/salary-rules/non-existent')
      .set('Authorization', `Bearer ${payrollUserToken}`);

    expect(res.status).toBe(404);
  });
});

describe('Salary Rules — POST input validation', () => {
  test('POST /api/salary-rules creates fixed rule successfully', async () => {
    const res = await request(app)
      .post('/api/salary-rules')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({
        structureId: 'structure-1',
        name: 'Fixed Allowance',
        code: 'FA',
        category: 'Allowance',
        sequence: 2,
        computationMethod: 'fixed',
        amount: 2500,
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe('FA');
    expect(res.body.amount).toBe(2500);
  });

  test('POST /api/salary-rules creates formula rule successfully', async () => {
    const res = await request(app)
      .post('/api/salary-rules')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({
        structureId: 'structure-1',
        name: 'PF Deduction',
        code: 'PF',
        category: 'Deduction',
        sequence: 10,
        computationMethod: 'formula',
        formula: 'BASIC * 0.12',
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe('PF');
    expect(res.body.formula).toBe('BASIC * 0.12');
  });

  test('POST /api/salary-rules requires formula when computationMethod is formula → 400', async () => {
    const res = await request(app)
      .post('/api/salary-rules')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({
        structureId: 'structure-1',
        name: 'Invalid Formula Rule',
        code: 'INV_F',
        category: 'Deduction',
        sequence: 11,
        computationMethod: 'formula',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/formula/i);
  });

  test('POST /api/salary-rules requires percentage fields when computationMethod is percentage → 400', async () => {
    const res = await request(app)
      .post('/api/salary-rules')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({
        structureId: 'structure-1',
        name: 'Invalid Percentage Rule',
        code: 'INV_P',
        category: 'Allowance',
        sequence: 12,
        computationMethod: 'percentage',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/percentageOf/i);
  });
});

describe('Salary Rules — PATCH regression tests (merge-and-revalidate)', () => {
  beforeEach(() => {
    currentRuleState = { ...initialRule };
  });

  test('PATCH /api/salary-rules/:id allows safe partial update (e.g. name, sequence) → 200', async () => {
    const res = await request(app)
      .patch('/api/salary-rules/rule-fixed')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({
        name: 'Renamed Basic Pay',
        sequence: 5,
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed Basic Pay');
    expect(res.body.sequence).toBe(5);
    expect(res.body.computationMethod).toBe('fixed');
    expect(res.body.amount).toBe(30000);
  });

  test('PATCH /api/salary-rules/:id switching fixed to formula WITHOUT formula → 400', async () => {
    // Attempting to change computationMethod to 'formula' without supplying formula
    const res = await request(app)
      .patch('/api/salary-rules/rule-fixed')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({
        computationMethod: 'formula',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/formula is required when computationMethod is "formula"/i);
  });

  test('PATCH /api/salary-rules/:id switching fixed to formula WITH valid formula → 200', async () => {
    const res = await request(app)
      .patch('/api/salary-rules/rule-fixed')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({
        computationMethod: 'formula',
        formula: 'CONTRACT_WAGE * 0.5',
      });

    expect(res.status).toBe(200);
    expect(res.body.computationMethod).toBe('formula');
    expect(res.body.formula).toBe('CONTRACT_WAGE * 0.5');
  });

  test('PATCH /api/salary-rules/:id switching to percentage WITHOUT percentage fields → 400', async () => {
    const res = await request(app)
      .patch('/api/salary-rules/rule-fixed')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({
        computationMethod: 'percentage',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/percentageOf and percentageValue are required/i);
  });

  test('PATCH /api/salary-rules/:id setting amount to null on fixed rule → 400', async () => {
    const res = await request(app)
      .patch('/api/salary-rules/rule-fixed')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({
        amount: null,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/amount is required when computationMethod is "fixed"/i);
  });

  test('PATCH /api/salary-rules/:id on non-existent rule → 404', async () => {
    const res = await request(app)
      .patch('/api/salary-rules/non-existent-rule')
      .set('Authorization', `Bearer ${payrollManagerToken}`)
      .send({
        name: 'Does Not Exist',
      });

    expect(res.status).toBe(404);
  });
});
