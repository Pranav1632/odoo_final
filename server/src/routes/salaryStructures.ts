import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiError } from '../lib/apiError';
import { writeAuditLog } from '../lib/audit';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
});

const updateSchema = z.object({
  name: z.string().min(1),
});

// GET /api/salary-structures
// Roles: HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN
router.get(
  '/',
  requireAuth,
  requireRole(['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const structures = await prisma.salaryStructure.findMany({
      include: {
        _count: { select: { rules: true, contracts: true } },
        rules: { orderBy: { sequence: 'asc' } },
      },
    });
    res.json(structures);
  })
);

// POST /api/salary-structures
// Roles: HR_PAYROLL_MANAGER, ADMIN
router.post(
  '/',
  requireAuth,
  requireRole(['HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const body = createSchema.parse(req.body);

    const structure = await prisma.salaryStructure.create({ data: body });

    await writeAuditLog({
      userId: session.userId,
      action: 'CREATE_SALARY_STRUCTURE',
      entityType: 'SalaryStructure',
      entityId: structure.id,
    });

    res.status(201).json(structure);
  })
);

// GET /api/salary-structures/:id
router.get(
  '/:id',
  requireAuth,
  requireRole(['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const structure = await prisma.salaryStructure.findUnique({
      where: { id: req.params.id },
      include: {
        rules: { orderBy: { sequence: 'asc' } },
        _count: { select: { contracts: true } },
      },
    });

    if (!structure) throw new ApiError(404, 'Salary structure not found');
    res.json(structure);
  })
);

// PATCH /api/salary-structures/:id
router.patch(
  '/:id',
  requireAuth,
  requireRole(['HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const body = updateSchema.parse(req.body);

    const existing = await prisma.salaryStructure.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) throw new ApiError(404, 'Salary structure not found');

    const updated = await prisma.salaryStructure.update({
      where: { id: req.params.id },
      data: body,
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'UPDATE_SALARY_STRUCTURE',
      entityType: 'SalaryStructure',
      entityId: updated.id,
    });

    res.json(updated);
  })
);

// DELETE /api/salary-structures/:id
router.delete(
  '/:id',
  requireAuth,
  requireRole(['HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const session = req.session!;

    const existing = await prisma.salaryStructure.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { contracts: true, payruns: true } } },
    });
    if (!existing) throw new ApiError(404, 'Salary structure not found');

    if (existing._count.contracts > 0 || existing._count.payruns > 0) {
      throw new ApiError(
        409,
        'Cannot delete a salary structure that is in use by contracts or payruns'
      );
    }

    await prisma.salaryStructure.delete({ where: { id: req.params.id } });

    await writeAuditLog({
      userId: session.userId,
      action: 'DELETE_SALARY_STRUCTURE',
      entityType: 'SalaryStructure',
      entityId: req.params.id,
    });

    res.status(204).send();
  })
);

export default router;
