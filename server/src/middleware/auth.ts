import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface Session {
  userId: string;
  email: string;
  role: string;
  employeeId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: Session;
    }
  }
}

/**
 * Verifies the Bearer JWT in Authorization header and attaches session to req.
 * Person A owns this middleware.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.session = jwt.verify(token, process.env.JWT_SECRET!) as Session;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

/**
 * Checks that req.session.role is in the allowed list.
 * Must be used after requireAuth.
 * Person A owns this middleware.
 */
export function requireRole(allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !allowed.includes(req.session.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
