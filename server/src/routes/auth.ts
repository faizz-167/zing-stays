<<<<<<< HEAD
import { Router } from 'express';
=======
import { Router, type Request, type Response, type NextFunction } from 'express';
>>>>>>> 5d1920d130ade9d1db7b407805e80425601798c3
import { z } from 'zod';
import bcrypt from 'bcrypt';
import passport from 'passport';
import { Strategy as GoogleStrategy, type Profile } from 'passport-google-oauth20';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sendOtp, verifyOtp } from '../services/otp';
import { signToken } from '../lib/jwt';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { otpSendLimiter, otpVerifyLimiter } from '../middleware/rateLimit';
import { logger } from '../lib/logger';

const router = Router();
<<<<<<< HEAD
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();
=======
>>>>>>> 5d1920d130ade9d1db7b407805e80425601798c3

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();
if (!ADMIN_EMAIL) throw new Error('ADMIN_EMAIL environment variable is required');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL ?? '/api/auth/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const BCRYPT_ROUNDS = 12;

// ─── Validation schemas ────────────────────────────────────────────────────────

const indianPhoneSchema = z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number');
const emailValueSchema = z.string().trim().toLowerCase().email('Invalid email address');

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: emailValueSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: emailValueSchema,
  password: z.string().min(1),
});

const otpEmailSchema = z.object({ email: emailValueSchema });

const verifyOtpSchema = z.object({
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

<<<<<<< HEAD

=======
// ─── Helpers ───────────────────────────────────────────────────────────────────

function setAuthCookie(res: Response, userId: number, email: string, isAdmin: boolean): void {
  const token = signToken({ userId, email, isAdmin });
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function userPayload(user: { id: number; email: string; name: string | null; phone: string | null; emailVerified: boolean; isPosterVerified: boolean; isAdmin: boolean }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    emailVerified: user.emailVerified,
    isPosterVerified: user.isPosterVerified,
    isAdmin: user.isAdmin,
  };
}

// ─── Google OAuth setup ────────────────────────────────────────────────────────

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (_accessToken: string, _refreshToken: string, profile: Profile, done: (err: unknown, user?: Express.User | false) => void) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) { done(new Error('No email from Google')); return; }

          const googleId = profile.id;
          const name = profile.displayName ?? null;

          // Upsert: attach googleId to existing account or create new one
          let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
          if (user) {
            if (user.googleId !== googleId) {
              [user] = await db
                .update(users)
                .set({ googleId })
                .where(eq(users.id, user.id))
                .returning();
            }
          } else {
            const isAdmin = email.toLowerCase() === ADMIN_EMAIL;
            [user] = await db
              .insert(users)
              .values({ email, googleId, name, isAdmin })
              .returning();
          }

          done(null, { userId: user.id, email: user.email, isAdmin: user.isAdmin } as Express.User);
        } catch (err) {
          done(err);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user as Express.User));

  router.use(passport.initialize());
}
>>>>>>> 5d1920d130ade9d1db7b407805e80425601798c3

// ─── Routes ────────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid request' });
    return;
  }
<<<<<<< HEAD
=======

  const { name, email, password } = result.data;
  try {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      res.status(409).json({ error: 'Email already registered.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const isAdmin = email === ADMIN_EMAIL;
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, name, isAdmin, emailVerified: false, isPosterVerified: false })
      .returning();

    setAuthCookie(res, user.id, user.email, user.isAdmin);
    res.status(201).json({ user: userPayload(user) });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid request' });
    return;
  }

  const { email, password } = result.data;
>>>>>>> 5d1920d130ade9d1db7b407805e80425601798c3
  try {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    setAuthCookie(res, user.id, user.email, user.isAdmin);
    res.json({ user: userPayload(user) });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/google — redirect to Google consent screen
router.get('/google', (req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    res.status(503).json({ error: 'Google OAuth not configured' });
    return;
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// GET /api/auth/google/callback
router.get(
  '/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      res.status(503).json({ error: 'Google OAuth not configured' });
      return;
    }
    passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/auth/login?error=oauth` })(req, res, next);
  },
  (req: Request, res: Response) => {
    const u = req.user as Express.User | undefined;
    if (!u) {
      res.redirect(`${FRONTEND_URL}/auth/login?error=oauth`);
      return;
    }
    setAuthCookie(res, u.userId, u.email, u.isAdmin);
    res.redirect(`${FRONTEND_URL}/dashboard`);
  },
);

// POST /api/auth/send-otp — requires auth; sends OTP for email verification
router.post('/send-otp', requireAuth, otpSendLimiter, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    await sendOtp(user.email);
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    logger.error('OTP send error', err);
    const message = err instanceof Error ? err.message : 'Failed to send OTP';
    const status = message.includes('wait before requesting') ? 429 : 500;
    res.status(status).json({ error: message });
  }
});

// POST /api/auth/verify-otp — requires auth; sets emailVerified and recalculates isPosterVerified
router.post('/verify-otp', requireAuth, otpVerifyLimiter, async (req: AuthRequest, res) => {
  const result = verifyOtpSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const userId = req.user!.userId;
  const { code } = result.data;

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const valid = await verifyOtp(user.email, code);
    if (!valid) {
      res.status(401).json({ error: 'Invalid or expired OTP' });
      return;
    }

    const isPosterVerified = !!(user.phone);
    const [updated] = await db
      .update(users)
      .set({ emailVerified: true, isPosterVerified })
      .where(eq(users.id, userId))
      .returning();

    res.json({ user: userPayload(updated) });
  } catch (err) {
    logger.error('verify-otp error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user: userPayload(user) });
  } catch (err) {
    logger.error('me error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/auth/profile — update name and/or phone; phone recalculates isPosterVerified
router.patch('/profile', requireAuth, async (req: AuthRequest, res) => {
  const result = profileSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid request' });
    return;
  }

  try {
    const [currentUser] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
    if (!currentUser) { res.status(404).json({ error: 'User not found' }); return; }

    const updates: Partial<typeof users.$inferInsert> = {};
    if (result.data.name !== undefined) updates.name = result.data.name;

    if (result.data.phone !== undefined) {
      updates.phone = result.data.phone || null;
      updates.isPosterVerified = currentUser.emailVerified && !!(updates.phone);
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

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('auth_token', { path: '/' });
  res.json({ success: true });
});

export default router;
