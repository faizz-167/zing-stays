import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { verifyToken, JwtPayload } from '../lib/jwt';
import { db } from '../db';
import { users } from '../db/schema';
import { logger } from '../lib/logger';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function extractAuthToken(req: Request): string | undefined {
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.auth_token;
  const authHeader = req.headers.authorization;
  return cookieToken ?? (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined);
}

export function getAuthPayload(req: Request): JwtPayload | undefined {
  const token = extractAuthToken(req);
  if (!token) return undefined;

  try {
    return verifyToken(token);
  } catch {
    return undefined;
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractAuthToken(req);

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const [user] = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (!user?.isAdmin) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    req.user.isAdmin = true;
    next();
  } catch (err) {
    logger.error('admin auth check error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
