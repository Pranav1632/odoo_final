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

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is awaiting HR/Admin approval.' });
    }
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
// Self-registration always creates an EMPLOYEE account with status 'pending' — it
// cannot log in until an Admin/HR approves it (and, at that point, can adjust the
// role — see PATCH /api/users/:id). Role assignment/escalation is never a
// caller-supplied field on this public endpoint.
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, name } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'EMPLOYEE',
        status: 'pending',
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

    // No token — a pending account cannot log in yet.
    return res.status(201).json({
      pending: true,
      message: 'Registration submitted. An administrator must approve your account before you can sign in.',
      email: user.email,
    });
  })
);

export default router;
