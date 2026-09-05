import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiError } from '../lib/apiError';
import { z } from 'zod';

const router = Router();

const lineSchema = z.object({
  day: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  breakMins: z.number().int().min(0).default(0),
});

const createSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  lines: z.array(lineSchema).min(1),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  lines: z.array(lineSchema).min(1).optional(),
});

// Helper: compute weekly hours from schedule lines
function computeWeeklyHours(
  lines: { startTime: string; endTime: string; breakMins: number }[]
): number {
  const totalMins = lines.reduce((sum, line) => {
    const [sh, sm] = line.startTime.split(':').map(Number);
    const [eh, em] = line.endTime.split(':').map(Number);
    const mins = eh * 60 + em - (sh * 60 + sm) - line.breakMins;
    return sum + mins;
  }, 0);
  return Math.round((totalMins / 60) * 10) / 10;
}

// GET /api/schedules
router.get(
  '/',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const schedules = await prisma.workingSchedule.findMany({
      include: {
        lines: true,
        _count: { select: { employees: true } },
      },
    });

    const result = schedules.map((s: any) => ({
      ...s,
      weeklyHours: computeWeeklyHours(s.lines),
    }));

    return res.json(result);
  })
);

// POST /api/schedules
router.post(
  '/',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const schedule = await prisma.workingSchedule.create({
      data: {
        name: body.name,
        type: body.type,
        lines: { create: body.lines },
      },
      include: { lines: true },
    });

    return res.status(201).json({
      ...schedule,
      weeklyHours: computeWeeklyHours(schedule.lines),
    });
  })
);

// GET /api/schedules/:id
router.get(
  '/:id',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const schedule = await prisma.workingSchedule.findUnique({
      where: { id },
      include: {
        lines: true,
        employees: { select: { id: true, name: true } },
        _count: { select: { employees: true } },
      },
    });
    if (!schedule) throw new ApiError(404, 'Not found');

    return res.json({
      ...schedule,
      weeklyHours: computeWeeklyHours(schedule.lines),
    });
  })
);

// PATCH /api/schedules/:id
router.patch(
  '/:id',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const body = updateSchema.parse(req.body);

    // Delete-then-recreate of lines and the schedule update must be atomic —
    // otherwise a failure between the two steps leaves the schedule with zero lines.
    const schedule = await prisma.$transaction(async (tx) => {
      if (body.lines) {
        await tx.scheduleLine.deleteMany({
          where: { scheduleId: id },
        });
      }

      return tx.workingSchedule.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.type !== undefined ? { type: body.type } : {}),
          ...(body.lines ? { lines: { create: body.lines } } : {}),
        },
        include: { lines: true },
      });
    });

    return res.json({
      ...schedule,
      weeklyHours: computeWeeklyHours(schedule.lines),
    });
  })
);

// DELETE /api/schedules/:id
router.delete(
  '/:id',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    // Delete lines first, then schedule
    await prisma.scheduleLine.deleteMany({ where: { scheduleId: id } });
    await prisma.workingSchedule.delete({ where: { id } });
    return res.json({ success: true });
  })
);

export default router;
