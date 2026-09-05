import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

// GET /api/error-log
router.get(
  '/',
  requireAuth,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { route, from, to, page, limit } = req.query as Record<
      string,
      string | undefined
    >;

    const take = Math.min(parseInt(limit ?? '50', 10) || 50, 100);
    const skip = ((parseInt(page ?? '1', 10) || 1) - 1) * take;

    const where: Record<string, unknown> = {};
    if (route) where.route = route;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.errorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.errorLog.count({ where }),
    ]);

    return res.json({
      data: logs,
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
