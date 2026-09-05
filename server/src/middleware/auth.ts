import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface Session {
  userId: string;
  email: string;
  role: string;
  employeeId?: string;
}

declare global {
  namespace Express {
    interface Request {
      session?: Session;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.session = jwt.verify(token, process.env.JWT_SECRET!) as Session;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireRole(allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !allowed.includes(req.session.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
