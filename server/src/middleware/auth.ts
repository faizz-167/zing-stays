import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { fromNodeHeaders } from 'better-auth/node';
import { db } from '../db';
import { users } from '../db/schema';
import { logger } from '../lib/logger';
import { auth } from '../lib/auth';

export interface AuthUserPayload {
  userId: number;
  email: string;
  isAdmin: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthUserPayload;
}

type BetterAuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

function toAuthUser(session: BetterAuthSession | null): AuthUserPayload | undefined {
  if (!session?.user) {
    return undefined;
  }

  return {
    userId: Number(session.user.id),
    email: session.user.email,
    isAdmin: Boolean(session.user.isAdmin),
  };
}

async function getSession(req: Request): Promise<BetterAuthSession | null> {
  return auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
}

export async function getAuthPayload(req: Request): Promise<AuthUserPayload | undefined> {
  const session = await getSession(req);
  return toAuthUser(session);
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getAuthPayload(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error('auth session lookup error', err);
    res.status(401).json({ error: 'Unauthorized' });
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
