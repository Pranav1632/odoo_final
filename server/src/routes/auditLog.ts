import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

// GET /api/audit-log
router.get(
  '/',
  requireAuth,
  requireRole(['HR_PAYROLL_MANAGER', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const { userId, entityType, from, to, page, limit } = req.query as Record<
      string,
      string | undefined
    >;

    const take = Math.min(parseInt(limit ?? '50', 10) || 50, 100);
    const skip = ((parseInt(page ?? '1', 10) || 1) - 1) * take;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const userIds = Array.from(new Set(logs.map((l) => l.userId).filter(Boolean)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, employee: { select: { name: true } } },
    });
    const userMap = new Map(
      users.map((u) => [
        u.id,
        {
          email: u.email,
          name: u.employee?.name || u.email.split('@')[0],
        },
      ])
    );

    const logsWithUser = logs.map((l) => {
      const userInfo = userMap.get(l.userId);
      return {
        ...l,
        userName: userInfo?.name || l.userId,
        userEmail: userInfo?.email || null,
      };
    });

    return res.json({
      data: logsWithUser,
      pagination: {
        page: Math.floor(skip / take) + 1,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  })
);

export default router;
