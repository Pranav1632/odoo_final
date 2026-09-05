import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../lib/apiError';
import { writeErrorLog } from '../lib/errorLog';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join('; ') || 'Validation error';
    return res.status(400).json({ error: message, details: err.errors });
  }

  // Prisma throws on update/delete of a record whose where-clause matches nothing
  // (P2025) instead of returning null — every route that skips an explicit
  // findUnique-then-404 check before update/delete would otherwise surface this
  // as a generic 500. Handle it once, here, rather than adding the same guard to
  // every route.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    return res.status(404).json({ error: 'Not found' });
  }

  console.error('[API ERROR]', req.path, err);

  writeErrorLog({
    route: req.path,
    userId: req.session?.userId,
    message: (err as Error)?.message ?? 'Unknown error',
    stack: (err as Error)?.stack,
  }).catch(() => {});

  return res.status(500).json({ error: 'Internal server error' });
}
