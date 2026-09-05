import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../lib/apiError';
import { writeErrorLog } from '../lib/errorLog';

/**
 * Global Express error handler — must be mounted LAST after all routes.
 * Person A owns this middleware.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }

  // Zod validation errors — surface them as 400
  if (
    err instanceof Error &&
    err.name === 'ZodError' &&
    'issues' in (err as unknown as Record<string, unknown>)
  ) {
    const zodErr = err as unknown as { issues: Array<{ path: string[]; message: string }> };
    const message = zodErr.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return res.status(400).json({ error: message });
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
