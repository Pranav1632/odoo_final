import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiError } from '../lib/apiError';
import { z } from 'zod';

const router = Router();

const createSchema = z.object({
  employeeId: z.string().min(1),
  checkIn: z.string().transform((s) => new Date(s)),
  checkOut: z
    .string()
    .nullable()
    .optional()
    .transform((s) => (s ? new Date(s) : null)),
  status: z.enum(['normal', 'exception', 'corrected']).default('normal'),
});

const updateSchema = z.object({
  checkIn: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  checkOut: z
    .string()
    .nullable()
    .optional()
    .transform((s) => (s !== undefined ? (s ? new Date(s) : null) : undefined)),
  status: z.enum(['normal', 'exception', 'corrected']).optional(),
});

// GET /api/attendance
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const { employeeId, from, to, status } = req.query as Record<string, string | undefined>;

    // EMPLOYEE can only see their own records
    if (session.role === 'EMPLOYEE') {
      if (employeeId && employeeId !== session.employeeId) {
        throw new ApiError(403, 'Forbidden');
      }
      const records = await prisma.attendance.findMany({
        where: {
          employeeId: session.employeeId!,
          ...(from ? { checkIn: { gte: new Date(from) } } : {}),
          ...(to ? { checkIn: { lte: new Date(to) } } : {}),
          ...(status ? { status } : {}),
        },
        orderBy: { checkIn: 'desc' },
      });
      return res.json(records);
    }

    if (
      !['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'].includes(
        session.role
      )
    ) {
      throw new ApiError(403, 'Forbidden');
    }

    const records = await prisma.attendance.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(from ? { checkIn: { gte: new Date(from) } } : {}),
        ...(to ? { checkIn: { lte: new Date(to) } } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        employee: { select: { id: true, name: true, department: true } },
      },
      orderBy: { checkIn: 'desc' },
    });
    return res.json(records);
  })
);

// POST /api/attendance
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const body = createSchema.parse(req.body);

    // EMPLOYEE can only create their own attendance
    if (session.role === 'EMPLOYEE') {
      if (body.employeeId !== session.employeeId) {
        throw new ApiError(403, 'Forbidden');
      }
    } else if (
      !['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'].includes(
        session.role
      )
    ) {
      throw new ApiError(403, 'Forbidden');
    }

    // Auto-compute workedHours
    const workedHours = body.checkOut
      ? (body.checkOut.getTime() - body.checkIn.getTime()) / 3600000
      : null;

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: body.employeeId,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        workedHours: workedHours ? Math.round(workedHours * 100) / 100 : null,
        status: body.status,
      },
    });
    return res.status(201).json(attendance);
  })
);

// GET /api/attendance/:id
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const id = req.params.id as string;
    const record = await prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true, department: true } },
      },
    });
    if (!record) throw new ApiError(404, 'Not found');

    if (session.role === 'EMPLOYEE' && record.employeeId !== session.employeeId) {
      throw new ApiError(403, 'Forbidden');
    }
    return res.json(record);
  })
);

// PATCH /api/attendance/:id
router.patch(
  '/:id',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const body = updateSchema.parse(req.body);

    // Fetch existing to recompute workedHours
    const existing = await prisma.attendance.findUnique({
      where: { id },
    });
    if (!existing) throw new ApiError(404, 'Not found');

    const checkIn = body.checkIn ?? existing.checkIn;
    const checkOut =
      body.checkOut !== undefined ? body.checkOut : existing.checkOut;
    const workedHours = checkOut
      ? Math.round(
          ((checkOut.getTime() - checkIn.getTime()) / 3600000) * 100
        ) / 100
      : null;

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        ...(body.checkIn !== undefined ? { checkIn: body.checkIn } : {}),
        ...(body.checkOut !== undefined ? { checkOut: body.checkOut } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        workedHours,
      },
    });
    return res.json(updated);
  })
);

// DELETE /api/attendance/:id
router.delete(
  '/:id',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    await prisma.attendance.delete({ where: { id } });
    return res.json({ success: true });
  })
);

export default router;
