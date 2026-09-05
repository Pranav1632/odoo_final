import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiError } from '../lib/apiError';
import { writeAuditLog } from '../lib/audit';

const router = Router();

/**
 * Zod schema for creating/updating a salary rule.
 * Enforces conditional field requirements based on computationMethod.
 */
const ruleSchema = z
  .object({
    structureId: z.string(),
    name: z.string().min(1),
    code: z
      .string()
      .min(1)
      .regex(/^[A-Z_]+$/, 'Code must be uppercase letters and underscores only'),
    category: z.enum(['Basic', 'Allowance', 'Gross', 'Deduction', 'Net']),
    sequence: z.number().int().positive(),
    computationMethod: z.enum(['fixed', 'percentage', 'formula']),
    amount: z.number().optional().nullable(),
    percentageOf: z.string().optional().nullable(),
    percentageValue: z.number().min(0).max(100).optional().nullable(),
    formula: z.string().optional().nullable(),
  })
  .refine(
    (d) => d.computationMethod !== 'formula' || (d.formula && d.formula.trim().length > 0),
    { message: 'formula is required when computationMethod is "formula"', path: ['formula'] }
  )
  .refine(
    (d) =>
      d.computationMethod !== 'percentage' ||
      (d.percentageOf && d.percentageValue !== null && d.percentageValue !== undefined),
    {
      message:
        'percentageOf and percentageValue are required when computationMethod is "percentage"',
      path: ['percentageOf'],
    }
  )
  .refine((d) => d.computationMethod !== 'fixed' || d.amount !== null, {
    message: 'amount is required when computationMethod is "fixed"',
    path: ['amount'],
  });

// Base ZodObject (before refinements) — used to derive the partial update schema
const ruleBaseObject = z.object({
  structureId: z.string(),
  name: z.string().min(1),
  code: z
    .string()
    .min(1)
    .regex(/^[A-Z_]+$/, 'Code must be uppercase letters and underscores only'),
  category: z.enum(['Basic', 'Allowance', 'Gross', 'Deduction', 'Net']),
  sequence: z.number().int().positive(),
  computationMethod: z.enum(['fixed', 'percentage', 'formula']),
  amount: z.number().optional().nullable(),
  percentageOf: z.string().optional().nullable(),
  percentageValue: z.number().min(0).max(100).optional().nullable(),
  formula: z.string().optional().nullable(),
});

// Update schema — partial of base object, structureId not allowed in updates
// Refinements are skipped on PATCH to allow partial updates (e.g. changing only name)
const updateSchema = ruleBaseObject.partial().omit({ structureId: true });

// GET /api/salary-rules
// Roles: HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN
router.get(
  '/',
  requireAuth,
  requireRole(['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const { structureId } = req.query;
    const rules = await prisma.salaryRule.findMany({
      where: structureId ? { structureId: String(structureId) } : undefined,
      orderBy: { sequence: 'asc' },
    });
    res.json(rules);
  })
);

// POST /api/salary-rules
// Roles: HR_PAYROLL_MANAGER, ADMIN
router.post(
  '/',
  requireAuth,
  requireRole(['HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const body = ruleSchema.parse(req.body);

    // Verify the salary structure exists
    const structure = await prisma.salaryStructure.findUnique({
      where: { id: body.structureId },
    });
    if (!structure) throw new ApiError(404, 'Salary structure not found');

    const rule = await prisma.salaryRule.create({ data: body });

    await writeAuditLog({
      userId: session.userId,
      action: 'CREATE_SALARY_RULE',
      entityType: 'SalaryRule',
      entityId: rule.id,
    });

    res.status(201).json(rule);
  })
);

// GET /api/salary-rules/:id
router.get(
  '/:id',
  requireAuth,
  requireRole(['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const rule = await prisma.salaryRule.findUnique({ where: { id: req.params.id } });
    if (!rule) throw new ApiError(404, 'Salary rule not found');
    res.json(rule);
  })
);

// PATCH /api/salary-rules/:id
router.patch(
  '/:id',
  requireAuth,
  requireRole(['HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const body = updateSchema.parse(req.body);

    const existing = await prisma.salaryRule.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'Salary rule not found');

    const updated = await prisma.salaryRule.update({
      where: { id: req.params.id },
      data: body,
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'UPDATE_SALARY_RULE',
      entityType: 'SalaryRule',
      entityId: updated.id,
    });

    res.json(updated);
  })
);

// DELETE /api/salary-rules/:id
router.delete(
  '/:id',
  requireAuth,
  requireRole(['HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const session = req.session!;

    const existing = await prisma.salaryRule.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'Salary rule not found');

    await prisma.salaryRule.delete({ where: { id: req.params.id } });

    await writeAuditLog({
      userId: session.userId,
      action: 'DELETE_SALARY_RULE',
      entityType: 'SalaryRule',
      entityId: req.params.id,
    });

    res.status(204).send();
  })
);

export default router;
