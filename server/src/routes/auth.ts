import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/asyncHandler';
import { writeAuditLog } from '../lib/audit';
import { z } from 'zod';

const router = Router();

// Rate limiting for auth endpoints: max 15 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many auth requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: { select: { id: true, name: true } } },
    });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'Your account has been disabled. Contact an administrator.' });
    }

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
});

// POST /api/auth/register
// Self-registration creates an account with default status 'pending' (defined in Prisma schema default).
router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password, name } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Allow optional role from register or default to EMPLOYEE
    const role = (req.body.role && ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'HR_MANAGER', 'EMPLOYEE'].includes(req.body.role)) 
      ? req.body.role 
      : 'EMPLOYEE';

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

    await writeAuditLog({
      userId: user.id,
      action: 'REGISTER',
      entityType: 'User',
      entityId: user.id,
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
