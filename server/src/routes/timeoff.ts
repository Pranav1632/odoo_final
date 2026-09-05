import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { writeAuditLog } from '../lib/audit';
import { ApiError } from '../lib/apiError';
import { z } from 'zod';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// TIME OFF TYPES
// ═══════════════════════════════════════════════════════════════════

const typeCreateSchema = z.object({
  name: z.string().min(1),
  unit: z.enum(['days', 'hours']),
  requiresAllocation: z.boolean().default(true),
  payrollIntegrated: z.boolean().default(false),
});

const typeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.enum(['days', 'hours']).optional(),
  requiresAllocation: z.boolean().optional(),
  payrollIntegrated: z.boolean().optional(),
});

// GET /api/timeoff/types
router.get(
  '/types',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const types = await prisma.timeOffType.findMany({
      include: { _count: { select: { allocations: true, requests: true } } },
    });
    return res.json(types);
  })
);

// POST /api/timeoff/types
router.post(
  '/types',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const body = typeCreateSchema.parse(req.body);
    const type = await prisma.timeOffType.create({ data: body });
    return res.status(201).json(type);
  })
);

// PATCH /api/timeoff/types/:id
router.patch(
  '/types/:id',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const body = typeUpdateSchema.parse(req.body);
    const type = await prisma.timeOffType.update({
      where: { id },
      data: body,
    });
    return res.json(type);
  })
);

// DELETE /api/timeoff/types/:id
router.delete(
  '/types/:id',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    await prisma.timeOffType.delete({ where: { id } });
    return res.json({ success: true });
  })
);

// ═══════════════════════════════════════════════════════════════════
// ALLOCATIONS
// ═══════════════════════════════════════════════════════════════════

const allocationCreateSchema = z.object({
  employeeId: z.string().min(1),
  typeId: z.string().min(1),
  allocated: z.number().positive(),
  validFrom: z.string().transform((s) => new Date(s)),
  validTo: z.string().transform((s) => new Date(s)),
  approved: z.boolean().default(false),
});

const allocationUpdateSchema = z.object({
  allocated: z.number().positive().optional(),
  taken: z.number().min(0).optional(),
  validFrom: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  validTo: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  approved: z.boolean().optional(),
});

// GET /api/timeoff/allocations
router.get(
  '/allocations',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const { employeeId, typeId } = req.query as Record<string, string | undefined>;

    let whereClause: Record<string, unknown> = {};

    // EMPLOYEE can only see their own
    if (session.role === 'EMPLOYEE') {
      whereClause.employeeId = session.employeeId;
    } else if (employeeId) {
      whereClause.employeeId = employeeId;
    }
    if (typeId) whereClause.typeId = typeId;

    const allocations = await prisma.allocation.findMany({
      where: whereClause,
      include: {
        employee: { select: { id: true, name: true } },
        type: { select: { id: true, name: true, unit: true } },
      },
    });

    // Add computed `remaining` field
    const result = allocations.map((a: any) => ({
      ...a,
      remaining: a.allocated - a.taken,
    }));

    return res.json(result);
  })
);

// POST /api/timeoff/allocations
router.post(
  '/allocations',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const body = allocationCreateSchema.parse(req.body);
    const allocation = await prisma.allocation.create({
      data: body,
      include: {
        employee: { select: { id: true, name: true } },
        type: { select: { id: true, name: true, unit: true } },
      },
    });
    return res.status(201).json({
      ...allocation,
      remaining: allocation.allocated - allocation.taken,
    });
  })
);

// PATCH /api/timeoff/allocations/:id
router.patch(
  '/allocations/:id',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const body = allocationUpdateSchema.parse(req.body);
    const allocation = await prisma.allocation.update({
      where: { id },
      data: body as Record<string, unknown>,
    });
    return res.json({
      ...allocation,
      remaining: allocation.allocated - allocation.taken,
    });
  })
);

// ═══════════════════════════════════════════════════════════════════
// REQUESTS
// ═══════════════════════════════════════════════════════════════════

const requestCreateSchema = z.object({
  employeeId: z.string().min(1),
  typeId: z.string().min(1),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
  duration: z.number().positive(),
});

// GET /api/timeoff/requests
router.get(
  '/requests',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const { employeeId, status, typeId } = req.query as Record<string, string | undefined>;

    let whereClause: Record<string, unknown> = {};

    // EMPLOYEE can only see their own
    if (session.role === 'EMPLOYEE') {
      whereClause.employeeId = session.employeeId;
    } else if (employeeId) {
      whereClause.employeeId = employeeId;
    }
    if (status) whereClause.status = status;
    if (typeId) whereClause.typeId = typeId;

    const requests = await prisma.timeOffRequest.findMany({
      where: whereClause,
      include: {
        employee: { select: { id: true, name: true, department: true } },
        type: { select: { id: true, name: true, unit: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    return res.json(requests);
  })
);

// POST /api/timeoff/requests
router.post(
  '/requests',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const body = requestCreateSchema.parse(req.body);

    // EMPLOYEE can only create their own
    if (session.role === 'EMPLOYEE' && body.employeeId !== session.employeeId) {
      throw new ApiError(403, 'Forbidden');
    }

    const request = await prisma.timeOffRequest.create({
      data: body,
      include: {
        employee: { select: { id: true, name: true } },
        type: { select: { id: true, name: true } },
      },
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'CREATE_TIMEOFF_REQUEST',
      entityType: 'TimeOffRequest',
      entityId: request.id,
    });

    return res.status(201).json(request);
  })
);

// GET /api/timeoff/requests/:id
router.get(
  '/requests/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const id = req.params.id as string;
    const request = await prisma.timeOffRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true, department: true } },
        type: { select: { id: true, name: true, unit: true } },
      },
    });
    if (!request) throw new ApiError(404, 'Not found');

    if (session.role === 'EMPLOYEE' && request.employeeId !== session.employeeId) {
      throw new ApiError(403, 'Forbidden');
    }
    return res.json(request);
  })
);

// PATCH /api/timeoff/requests/:id/approve
router.patch(
  '/requests/:id/approve',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const id = req.params.id as string;

    await prisma.$transaction(async (tx: any) => {
      const request = await tx.timeOffRequest.findUnique({ where: { id } });
      if (!request) throw new ApiError(404, 'Request not found');
      if (request.status !== 'pending')
        throw new ApiError(400, 'Request is not pending');

      // Only check allocation if the type requires it
      const type = await tx.timeOffType.findUnique({
        where: { id: request.typeId },
      });
      if (type?.requiresAllocation) {
        const allocation = await tx.allocation.findFirst({
          where: {
            employeeId: request.employeeId,
            typeId: request.typeId,
            approved: true,
            validFrom: { lte: request.startDate },
            validTo: { gte: request.endDate },
          },
        });
        if (!allocation)
          throw new ApiError(400, 'No approved allocation found for this period');

        const remaining = allocation.allocated - allocation.taken;
        if (request.duration > remaining) {
          throw new ApiError(
            400,
            `Insufficient balance. Requested ${request.duration}, remaining ${remaining}`
          );
        }

        await tx.allocation.update({
          where: { id: allocation.id },
          data: { taken: { increment: request.duration } },
        });
      }

      await tx.timeOffRequest.update({
        where: { id },
        data: { status: 'approved' },
      });
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'APPROVE_TIMEOFF',
      entityType: 'TimeOffRequest',
      entityId: id,
    });

    return res.json({ success: true });
  })
);

// PATCH /api/timeoff/requests/:id/refuse
router.patch(
  '/requests/:id/refuse',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const id = req.params.id as string;

    const request = await prisma.timeOffRequest.findUnique({ where: { id } });
    if (!request) throw new ApiError(404, 'Request not found');
    if (request.status !== 'pending')
      throw new ApiError(400, 'Request is not pending');

    await prisma.timeOffRequest.update({
      where: { id },
      data: { status: 'refused' },
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'REFUSE_TIMEOFF',
      entityType: 'TimeOffRequest',
      entityId: id,
    });

    return res.json({ success: true });
  })
);

export default router;
