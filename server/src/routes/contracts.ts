import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { writeAuditLog } from '../lib/audit';
import { ApiError } from '../lib/apiError';
import { z } from 'zod';

const router = Router();

const createSchema = z.object({
  employeeId: z.string().min(1),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z
    .string()
    .nullable()
    .optional()
    .transform((s) => (s ? new Date(s) : null)),
  wage: z.number().positive(),
  department: z.string().min(1),
  position: z.string().min(1),
  salaryStructureId: z.string().min(1),
  status: z.enum(['active', 'expired', 'draft']).default('active'),
});

const updateSchema = z.object({
  startDate: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  endDate: z
    .string()
    .nullable()
    .optional()
    .transform((s) => (s !== undefined ? (s ? new Date(s) : null) : undefined)),
  wage: z.number().positive().optional(),
  department: z.string().min(1).optional(),
  position: z.string().min(1).optional(),
  salaryStructureId: z.string().min(1).optional(),
  status: z.enum(['active', 'expired', 'draft']).optional(),
});

// GET /api/contracts
router.get(
  '/',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;

    const contracts = await prisma.contract.findMany({
      where: employeeId ? { employeeId } : undefined,
      include: {
        employee: { select: { id: true, name: true, department: true } },
        salaryStructure: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    return res.json(contracts);
  })
);

// POST /api/contracts
router.post(
  '/',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const body = createSchema.parse(req.body);

    // 409 overlap check — cannot have two active contracts for same employee
    if (body.status === 'active') {
      const existing = await prisma.contract.findFirst({
        where: { employeeId: body.employeeId, status: 'active' },
      });
      if (existing) {
        return res.status(409).json({
          error:
            'Employee already has an active contract. Expire the existing one first.',
        });
      }
    }

    const contract = await prisma.contract.create({
      data: {
        employeeId: body.employeeId,
        startDate: body.startDate,
        endDate: body.endDate,
        wage: body.wage,
        department: body.department,
        position: body.position,
        salaryStructureId: body.salaryStructureId,
        status: body.status,
      },
      include: { salaryStructure: { select: { id: true, name: true } } },
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'CREATE_CONTRACT',
      entityType: 'Contract',
      entityId: contract.id,
      details: { wage: contract.wage, department: contract.department, position: contract.position, status: contract.status },
    });
    return res.status(201).json(contract);
  })
);

// GET /api/contracts/:id
router.get(
  '/:id',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true, department: true } },
        salaryStructure: { select: { id: true, name: true } },
      },
    });
    if (!contract) throw new ApiError(404, 'Not found');
    return res.json(contract);
  })
);

// PATCH /api/contracts/:id
router.patch(
  '/:id',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const id = req.params.id as string;
    const body = updateSchema.parse(req.body);

    // Same invariant enforced on create — cannot have two active contracts for the
    // same employee. Applies whenever this update would result in status 'active'.
    if (body.status === 'active') {
      const current = await prisma.contract.findUnique({ where: { id } });
      if (!current) throw new ApiError(404, 'Not found');
      const existing = await prisma.contract.findFirst({
        where: { employeeId: current.employeeId, status: 'active', id: { not: id } },
      });
      if (existing) {
        return res.status(409).json({
          error:
            'Employee already has an active contract. Expire the existing one first.',
        });
      }
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: body as Record<string, unknown>,
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'UPDATE_CONTRACT',
      entityType: 'Contract',
      entityId: contract.id,
      details: body as unknown as Record<string, unknown>,
    });
    return res.json(contract);
  })
);

// DELETE /api/contracts/:id
router.delete(
  '/:id',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const id = req.params.id as string;
    await prisma.contract.delete({ where: { id } });
    await writeAuditLog({
      userId: session.userId,
      action: 'DELETE_CONTRACT',
      entityType: 'Contract',
      entityId: id,
    });
    return res.json({ success: true });
  })
);

export default router;
