import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';
import { AuthRequest } from './auth';
import { logger } from '../lib/logger';

interface RateLimitOptions {
  keyPrefix: string;
  max: number;
  windowSeconds: number;
  keyFn: (req: Request) => string;
}

function createRateLimiter(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `rl:${options.keyPrefix}:${options.keyFn(req)}`;
    const now = Date.now();
    const windowStart = now - options.windowSeconds * 1000;
    const member = `${now}:${Math.random().toString(36).slice(2)}`;

    try {
      const results = await redis
        .multi()
        .zremrangebyscore(key, 0, windowStart)
        .zadd(key, now, member)
        .zcard(key)
        .expire(key, options.windowSeconds)
        .exec();

      const current = Number(results?.[2]?.[1] ?? 0);
      if (current > options.max) {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return;
      }
    } catch (err) {
      // Redis unavailable — fail open to avoid blocking users
      logger.error('Rate limiter error', err);
    }
    next();
  };
}

/**
 * Returns the real client IP.
 *
 * Express sets req.ip correctly when app.set('trust proxy', N) is configured
 * to match the number of trusted reverse-proxy hops in front of this server.
 * Never parse X-Forwarded-For manually — it is trivially spoofable by any
 * client that can set arbitrary headers.
 */
function getClientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

/** 5 OTP send requests per email per 10 minutes */
export const otpSendLimiter = createRateLimiter({
  keyPrefix: 'otp_send',
  max: 5,
  windowSeconds: 10 * 60,
  keyFn: (req) => (req.body?.email as string | undefined) ?? getClientIp(req),
});

/** 10 OTP verify attempts per email per 10 minutes */
export const otpVerifyLimiter = createRateLimiter({
  keyPrefix: 'otp_verify',
  max: 10,
  windowSeconds: 10 * 60,
  keyFn: (req) => (req.body?.email as string | undefined) ?? getClientIp(req),
});

/** 20 contact reveals per user per hour */
export const contactRevealLimiter = createRateLimiter({
  keyPrefix: 'contact_reveal',
  max: 20,
  windowSeconds: 60 * 60,
  keyFn: (req) => String((req as AuthRequest).user?.userId ?? getClientIp(req)),
});

/** 30 image auth requests per user per 10 minutes */
export const imageAuthLimiter = createRateLimiter({
  keyPrefix: 'image_auth',
  max: 30,
  windowSeconds: 10 * 60,
  keyFn: (req) => String((req as AuthRequest).user?.userId ?? getClientIp(req)),
});

/** 5 review submissions per user per hour */
export const reviewPostLimiter = createRateLimiter({
  keyPrefix: 'review_post',
  max: 5,
  windowSeconds: 60 * 60,
  keyFn: (req) => String((req as AuthRequest).user?.userId ?? getClientIp(req)),
});

/** 60 search requests per IP per minute */
export const searchLimiter = createRateLimiter({
  keyPrefix: 'search',
  max: 60,
  windowSeconds: 60,
  keyFn: getClientIp,
});
