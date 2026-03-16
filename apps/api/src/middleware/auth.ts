import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = () =>
  process.env.JWT_SECRET || 'qa-detective-super-secret-jwt-key-change-in-production';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET()) as TokenPayload;
    req.userId = payload.userId;
    req.userEmail = payload.email;
    req.userName = payload.name;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET()) as TokenPayload;
      req.userId = payload.userId;
      req.userEmail = payload.email;
      req.userName = payload.name;
    } catch {
      // Invalid token — continue as unauthenticated
    }
  }

  next();
}
