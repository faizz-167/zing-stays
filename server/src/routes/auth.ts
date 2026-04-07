import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { users, otpSessions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sendOtp, verifyOtp } from '../services/otp';
import { signToken } from '../lib/jwt';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const phoneSchema = z.object({
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number'),
});

const verifySchema = z.object({
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number'),
  code: z.string().length(6),
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  const result = phoneSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0].message });
    return;
  }
  try {
    await sendOtp(result.data.phone);
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('OTP send error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const result = verifySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const { phone, code } = result.data;
  try {
    const valid = await verifyOtp(phone, code);
    if (!valid) {
      res.status(401).json({ error: 'Invalid or expired OTP' });
      return;
    }

    // Upsert user
    let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (!user) {
      [user] = await db.insert(users).values({ phone }).returning();
    }

    const token = signToken({
      userId: user.id,
      phone: user.phone,
      isAdmin: user.isAdmin,
    });

    res.json({ token, user: { id: user.id, phone: user.phone, name: user.name } });
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
    res.json({ user: { id: user.id, phone: user.phone, name: user.name } });
  } catch (err) {
    console.error('me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/auth/profile
router.patch('/profile', requireAuth, async (req: AuthRequest, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Name required' }); return;
  }
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 100) {
    res.status(400).json({ error: 'Name must be 1–100 characters' }); return;
  }
  try {
    const [updated] = await db
      .update(users)
      .set({ name: trimmed })
      .where(eq(users.id, req.user!.userId))
      .returning();
    res.json({ user: { id: updated.id, phone: updated.phone, name: updated.name } });
  } catch (err) {
    console.error('profile update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
