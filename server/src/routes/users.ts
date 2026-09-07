import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiError } from '../lib/apiError';
import { writeAuditLog } from '../lib/audit';

const router = Router();

const ROLES = ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'HR_MANAGER', 'EMPLOYEE'] as const;

// ---------------------------------------------------------------------------
// GET /api/users — list every account (pending, active, disabled)
// Admin only — this is the account/role-assignment surface the PS calls for.
// ---------------------------------------------------------------------------
router.get(
  '/',
  requireAuth,
  requireRole(['ADMIN']),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        employee: { select: { id: true, name: true, department: true } },
      },
      orderBy: [{ status: 'asc' }, { email: 'asc' }],
    });
    res.json(users);
  })
);

const updateSchema = z.object({
  role: z.enum(ROLES).optional(),
  status: z.enum(['pending', 'active', 'disabled']).optional(),
});

// ---------------------------------------------------------------------------
// PATCH /api/users/:id — approve/disable an account and/or change its role
// Admin only. This is both the "approve a pending registration" action and
// the general role-assignment action the PS names as an Admin capability.
// ---------------------------------------------------------------------------
router.patch(
  '/:id',
  requireAuth,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const id = req.params.id as string;
    const body = updateSchema.parse(req.body);

    if (!body.role && !body.status) {
      throw new ApiError(400, 'Provide at least one of role or status');
    }

    // An Admin can't strand the system by disabling/demoting their own last-admin
    // account by mistake — keep this simple and just block self-modification.
    if (id === session.userId) {
      throw new ApiError(400, 'Cannot change your own account role or status');
    }

    const before = await prisma.user.findUnique({ where: { id } });
    if (!before) throw new ApiError(404, 'Not found');

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(body.role ? { role: body.role } : {}),
        ...(body.status ? { status: body.status } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        employee: { select: { id: true, name: true, department: true } },
      },
    });

    await writeAuditLog({
      userId: session.userId,
      action:
        body.status === 'active' && before.status === 'pending'
          ? 'APPROVE_USER'
          : 'UPDATE_USER',
      entityType: 'User',
      entityId: id,
      details: { before: { role: before.role, status: before.status }, after: body },
    });

    res.json(user);
  })
);

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

// Role hierarchy rank for password reset authorization
const ROLE_HIERARCHY: Record<string, number> = {
  ADMIN: 4,
  HR_MANAGER: 3,
  HR_PAYROLL_MANAGER: 2,
  HR_PAYROLL_USER: 1,
  EMPLOYEE: 0,
};

// ---------------------------------------------------------------------------
// POST /api/users/:id/reset-password
// Reset password by higher authority (ADMIN, HR_MANAGER, HR_PAYROLL_MANAGER)
// ---------------------------------------------------------------------------
router.post(
  '/:id/reset-password',
  requireAuth,
  requireRole(['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER']),
  asyncHandler(async (req, res) => {
    const session = req.session!;
    const targetUserId = req.params.id as string;
    const { newPassword } = resetPasswordSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new ApiError(404, 'User not found');

    const requesterRank = ROLE_HIERARCHY[session.role] ?? 0;
    const targetRank = ROLE_HIERARCHY[targetUser.role] ?? 0;

    // Admin can reset anyone's password.
    // Non-admins can only reset passwords of users strictly lower in hierarchy.
    if (session.role !== 'ADMIN' && requesterRank <= targetRank) {
      throw new ApiError(403, 'Forbidden: You cannot reset the password for a user with equal or higher authority');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: targetUserId },
      data: { password: hashedPassword },
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'RESET_USER_PASSWORD',
      entityType: 'User',
      entityId: targetUserId,
      details: { resetBy: session.userId, resetByRole: session.role, targetEmail: targetUser.email },
    });

    res.json({ message: 'Password reset successfully' });
  })
);

export default router;

