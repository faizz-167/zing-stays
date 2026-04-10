import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { sendOtp, verifyOtp } from '../services/otp';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { otpSendLimiter, otpVerifyLimiter } from '../middleware/rateLimit';
import { logger } from '../lib/logger';

const router = Router();

const indianPhoneSchema = z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number');

const verifyOtpSchema = z.object({
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

function userPayload(user: {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  emailVerified: boolean;
  posterEmailVerified: boolean;
  isPosterVerified: boolean;
  isAdmin: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    emailVerified: user.emailVerified,
    posterEmailVerified: user.posterEmailVerified,
    isPosterVerified: user.isPosterVerified,
    isAdmin: user.isAdmin,
  };
}

router.post('/send-otp', requireAuth, otpSendLimiter, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await sendOtp(user.email);
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    logger.error('OTP send error', err);
    const message = err instanceof Error ? err.message : 'Failed to send OTP';
    const status = message.includes('wait before requesting') ? 429 : 500;
    res.status(status).json({ error: message });
  }
});

router.post('/verify-otp', requireAuth, otpVerifyLimiter, async (req: AuthRequest, res) => {
  const result = verifyOtpSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const valid = await verifyOtp(user.email, result.data.code);
    if (!valid) {
      res.status(401).json({ error: 'Invalid or expired OTP' });
      return;
    }

    const [updated] = await db
      .update(users)
      .set({
        posterEmailVerified: true,
        isPosterVerified: Boolean(user.phone),
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user!.userId))
      .returning();

    res.json({ user: userPayload(updated) });
  } catch (err) {
    logger.error('verify-otp error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: userPayload(user) });
  } catch (err) {
    logger.error('me error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/profile', requireAuth, async (req: AuthRequest, res) => {
  const result = profileSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid request' });
    return;
  }

  try {
    const [currentUser] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
    if (!currentUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (result.data.name !== undefined) {
      updates.name = result.data.name;
    }

    if (result.data.phone !== undefined) {
      updates.phone = result.data.phone || null;
      updates.isPosterVerified = currentUser.posterEmailVerified && Boolean(updates.phone);
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.user!.userId))
      .returning();

    res.json({ user: userPayload(updated) });
  } catch (err) {
    logger.error('profile update error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
