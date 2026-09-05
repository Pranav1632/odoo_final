import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/asyncHandler';
import { writeAuditLog } from '../lib/audit';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: { select: { id: true, name: true } } },
    });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employee?.id,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    );

    await writeAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
    });

    return res.json({
      token,
      userId: user.id,
      role: user.role,
      employeeId: user.employee?.id,
      name: user.employee?.name || user.email.split('@')[0],
      email: user.email,
    });
  })
);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  name: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'HR_MANAGER', 'EMPLOYEE']).optional(),
});

// POST /api/auth/register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, name, role = 'EMPLOYEE' } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role as any,
        employee: {
          create: {
            name: name || email.split('@')[0],
            department: 'Operations',
            jobPosition: 'Staff',
          },
        },
      },
      include: { employee: { select: { id: true, name: true } } },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employee?.id,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    );

    await writeAuditLog({
      userId: user.id,
      action: 'REGISTER',
      entityType: 'User',
      entityId: user.id,
    });

    return res.status(201).json({
      token,
      userId: user.id,
      role: user.role,
      employeeId: user.employee?.id,
      name: user.employee?.name || user.email.split('@')[0],
      email: user.email,
    });
  })
);

export default router;
