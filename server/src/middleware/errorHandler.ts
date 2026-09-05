import { Request, Response, NextFunction } from 'express';
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

  console.error('[API ERROR]', req.path, err);

  writeErrorLog({
    route: req.path,
    userId: req.session?.userId,
    message: (err as Error)?.message ?? 'Unknown error',
    stack: (err as Error)?.stack,
  }).catch(() => {});

  return res.status(500).json({ error: 'Internal server error' });
}
