import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import nodemailer from 'nodemailer';
import { eq, and, gt, desc } from 'drizzle-orm';
import { db } from '../db';
import { otpSessions } from '../db/schema';

const otpHashSecret = process.env.OTP_SECRET ?? process.env.JWT_SECRET;
if (!otpHashSecret) {
  throw new Error('OTP_SECRET or JWT_SECRET environment variable is required');
}
const OTP_HASH_SECRET: string = otpHashSecret;

const MAX_OTP_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_DEV_CONSOLE_FALLBACK = process.env.OTP_DEV_CONSOLE_FALLBACK === 'true';
const OTP_EMAIL_FROM = process.env.OTP_EMAIL_FROM;
const OTP_EMAIL_SUBJECT = process.env.OTP_EMAIL_SUBJECT ?? 'Your ZingBrokers verification code';
const OTP_EMAIL_TEXT_TEMPLATE =
  process.env.OTP_EMAIL_TEXT_TEMPLATE ??
  'Your ZingBrokers verification code is {CODE}. It expires in 10 minutes.';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';

const transporter = SMTP_HOST && SMTP_PORT && OTP_EMAIL_FROM
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER && SMTP_PASS
        ? {
            user: SMTP_USER,
            pass: SMTP_PASS,
          }
        : undefined,
    })
  : null;

function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

function hashOtp(code: string): string {
  return createHmac('sha256', OTP_HASH_SECRET).update(code).digest('hex');
}

function hashesMatch(expectedHash: string, candidateCode: string): boolean {
  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(hashOtp(candidateCode), 'hex');

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

function getEmailFallbackReason(): string {
  if (transporter) {
    return 'SMTP delivery failed';
  }

  return 'SMTP is not configured';
}

export async function sendOtp(email: string): Promise<void> {
  const [recentSession] = await db
    .select()
    .from(otpSessions)
    .where(eq(otpSessions.email, email))
    .orderBy(desc(otpSessions.createdAt))
    .limit(1);

  if (recentSession && recentSession.createdAt.getTime() > Date.now() - OTP_RESEND_COOLDOWN_MS) {
    throw new Error('Please wait before requesting another OTP');
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Delete any existing OTP for this email
  await db.delete(otpSessions).where(eq(otpSessions.email, email));

  // Store new OTP
  await db.insert(otpSessions).values({ email, code: hashOtp(code), expiresAt });

  const text = OTP_EMAIL_TEXT_TEMPLATE.replaceAll('{CODE}', code);
  try {
    if (!transporter || !OTP_EMAIL_FROM) {
      throw new Error(getEmailFallbackReason());
    }

    await transporter.sendMail({
      from: OTP_EMAIL_FROM,
      to: email,
      subject: OTP_EMAIL_SUBJECT,
      text,
    });
  } catch (err) {
    const providerMessage = err instanceof Error ? err.message : 'Failed to send OTP email';

    if (
      OTP_DEV_CONSOLE_FALLBACK &&
      process.env.NODE_ENV !== 'production' &&
      providerMessage
    ) {
      console.warn(
        `Email OTP send unavailable. Using console fallback for ${email}: ${code}. Provider message: ${providerMessage}`,
      );
      return;
    }

    // Rollback: remove the OTP we just stored since it was never delivered
    await db.delete(otpSessions).where(eq(otpSessions.email, email));
    console.error('Email OTP dispatch failed:', providerMessage);

    throw new Error(providerMessage || 'Failed to send OTP. Please try again later.');
  }
}

export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const [session] = await db
    .select()
    .from(otpSessions)
    .where(
      and(
        eq(otpSessions.email, email),
        gt(otpSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!session) return false;

  // Check if max attempts exceeded
  if (session.attempts >= MAX_OTP_ATTEMPTS) {
    await db.delete(otpSessions).where(eq(otpSessions.id, session.id));
    return false;
  }

  // Check code
  if (!hashesMatch(session.code, code)) {
    // Increment attempt counter
    await db
      .update(otpSessions)
      .set({ attempts: session.attempts + 1 })
      .where(eq(otpSessions.id, session.id));
    return false;
  }

  // Code is correct — delete the session
  await db.delete(otpSessions).where(eq(otpSessions.id, session.id));
  return true;
}
