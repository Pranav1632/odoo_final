import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { writeAuditLog } from '../lib/audit';
import { ApiError } from '../lib/apiError';
import { z } from 'zod';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  jobPosition: z.string().min(1),
  scheduleId: z.string().optional(),
  managerId: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  jobPosition: z.string().min(1).optional(),
  scheduleId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
});

// GET /api/employees
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = req.session!;

    // EMPLOYEE role can only see themselves
    if (session.role === 'EMPLOYEE') {
      const emp = await prisma.employee.findFirst({
        where: { userId: session.userId },
        include: {
          schedule: true,
          _count: {
            select: { contracts: true, attendances: true, timeOffRequests: true },
          },
        },
      });
      return res.json(emp ? [emp] : []);
    }

    if (
      !['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'].includes(
        session.role
      )
    ) {
      throw new ApiError(403, 'Forbidden');
    }

    const department = typeof req.query.department === 'string' ? req.query.department : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const where: any = {};
    if (department) where.department = department;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { jobPosition: { contains: search, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        schedule: true,
        contracts: {
          take: 1,
          orderBy: { startDate: 'desc' },
          select: { id: true, position: true, wage: true, status: true },
        },
        _count: {
          select: {
            contracts: true,
            attendances: true,
            timeOffRequests: true,
            allocations: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json(employees);
  })
);

// POST /api/employees
router.post(
  '/',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const body = createSchema.parse(req.body);
    const employee = await prisma.employee.create({ data: body });
    await writeAuditLog({
      userId: session.userId,
      action: 'CREATE_EMPLOYEE',
      entityType: 'Employee',
      entityId: employee.id,
      details: body as Record<string, unknown>,
    });
    return res.status(201).json(employee);
  })
);

// GET /api/employees/:id
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const id = req.params.id as string;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        schedule: true,
        contracts: {
          include: { salaryStructure: { select: { id: true, name: true } } },
          orderBy: { startDate: 'desc' },
        },
        _count: {
          select: {
            contracts: true,
            attendances: true,
            timeOffRequests: true,
            allocations: true,
          },
        },
      },
    });
    if (!employee) throw new ApiError(404, 'Not found');
    if (session.role === 'EMPLOYEE' && employee.userId !== session.userId) {
      throw new ApiError(403, 'Forbidden');
    }
    return res.json(employee);
  })
);

// PATCH /api/employees/:id
router.patch(
  '/:id',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const id = req.params.id as string;
    const body = updateSchema.parse(req.body);
    const employee = await prisma.employee.update({
      where: { id },
      data: body,
    });
    await writeAuditLog({
      userId: session.userId,
      action: 'UPDATE_EMPLOYEE',
      entityType: 'Employee',
      entityId: employee.id,
      details: body as Record<string, unknown>,
    });
    return res.json(employee);
  })
);

// DELETE /api/employees/:id
router.delete(
  '/:id',
  requireAuth,
  requireRole(['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const id = req.params.id as string;
    await prisma.employee.delete({ where: { id } });
    await writeAuditLog({
      userId: session.userId,
      action: 'DELETE_EMPLOYEE',
      entityType: 'Employee',
      entityId: id,
    });
    return res.json({ success: true });
  })
);

export default router;
