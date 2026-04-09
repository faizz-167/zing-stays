import { Router, type Request } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sendOtp, verifyOtp } from '../services/otp';
import { signToken } from '../lib/jwt';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { otpSendLimiter, otpVerifyLimiter } from '../middleware/rateLimit';

const router = Router();
const OTP_IP_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const OTP_IP_LIMIT_MAX_REQUESTS = 5;
const otpRequestLog = new Map<string, number[]>();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();

if (!ADMIN_EMAIL) {
  throw new Error('ADMIN_EMAIL environment variable is required');
}

const indianPhoneSchema = z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number');
const emailValueSchema = z.string().trim().toLowerCase().email('Invalid email address');

const emailSchema = z.object({
  email: emailValueSchema,
});

const verifySchema = z.object({
  email: emailValueSchema,
  code: z.string().length(6),
});

const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    phone: z.union([indianPhoneSchema, z.literal('')]).optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.phone !== undefined,
    { message: 'At least one field is required' },
  );

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim();
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

function isOtpRateLimited(ip: string): boolean {
  const now = Date.now();
  const recentRequests = (otpRequestLog.get(ip) ?? []).filter(
    (timestamp) => timestamp > now - OTP_IP_LIMIT_WINDOW_MS,
  );

  if (recentRequests.length >= OTP_IP_LIMIT_MAX_REQUESTS) {
    otpRequestLog.set(ip, recentRequests);
    return true;
  }

  recentRequests.push(now);
  otpRequestLog.set(ip, recentRequests);
  return false;
}

// POST /api/auth/send-otp
router.post('/send-otp', otpSendLimiter, async (req, res) => {
  const result = emailSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid request' });
    return;
  }
  if (isOtpRateLimited(getClientIp(req))) {
    res.status(429).json({ error: 'Too many OTP requests. Please try again later.' });
    return;
  }
  try {
    await sendOtp(result.data.email);
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('OTP send error:', err);
    const message = err instanceof Error ? err.message : 'Failed to send OTP';
    const status = message.includes('wait before requesting') ? 429 : 500;
    res.status(status).json({ error: message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', otpVerifyLimiter, async (req, res) => {
  const result = verifySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const { email, code } = result.data;
  try {
    const valid = await verifyOtp(email, code);
    if (!valid) {
      res.status(401).json({ error: 'Invalid or expired OTP' });
      return;
    }

    const shouldBeAdmin = email === ADMIN_EMAIL;
    let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      [user] = await db.insert(users).values({ email, isAdmin: shouldBeAdmin }).returning();
    } else if (user.isAdmin !== shouldBeAdmin) {
      [user] = await db
        .update(users)
        .set({ isAdmin: shouldBeAdmin })
        .where(eq(users.id, user.id))
        .returning();
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      user: { id: user.id, email: user.email, phone: user.phone, name: user.name, isAdmin: user.isAdmin },
    });
  } catch (err) {
    console.error('verify-otp error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({
      user: { id: user.id, email: user.email, phone: user.phone, name: user.name, isAdmin: user.isAdmin },
    });
  } catch (err) {
    console.error('me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/auth/profile
router.patch('/profile', requireAuth, async (req: AuthRequest, res) => {
  const result = profileSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid request' }); return;
  }

  const updates: Partial<typeof users.$inferInsert> = {};
  if (result.data.name !== undefined) updates.name = result.data.name;
  if (result.data.phone !== undefined) updates.phone = result.data.phone || null;

  try {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.user!.userId))
      .returning();
    res.json({
      user: {
        id: updated.id,
        email: updated.email,
        phone: updated.phone,
        name: updated.name,
        isAdmin: updated.isAdmin,
      },
    });
  } catch (err) {
    console.error('profile update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('auth_token', { path: '/' });
  res.json({ success: true });
});

export default router;
