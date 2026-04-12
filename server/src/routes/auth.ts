import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { sendOtp, verifyOtp } from '../services/otp';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { otpSendLimiter, otpVerifyLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../lib/asyncHandler';
import { ValidationError, NotFoundError, AppError } from '../lib/errors';

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

router.post('/send-otp', requireAuth, otpSendLimiter, asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new NotFoundError('User not found');

  try {
    await sendOtp(user.email);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send OTP';
    throw message.includes('wait before requesting') ? new AppError(429, message) : new AppError(500, message);
  }
  res.json({ message: 'OTP sent successfully' });
}));

router.post('/verify-otp', requireAuth, otpVerifyLimiter, asyncHandler(async (req: AuthRequest, res) => {
  const result = verifyOtpSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError('Invalid request');

  const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
  if (!user) throw new NotFoundError('User not found');

  const valid = await verifyOtp(user.email, result.data.code);
  if (!valid) throw new AppError(401, 'Invalid or expired OTP');

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
}));

router.get('/me', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
  if (!user) throw new NotFoundError('User not found');
  res.json({ user: userPayload(user) });
}));

router.patch('/profile', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const result = profileSchema.safeParse(req.body);
  if (!result.success) throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid request');

  const [currentUser] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
  if (!currentUser) throw new NotFoundError('User not found');

  const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

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
}));

export default router;
