import { randomInt } from 'crypto';
import axios from 'axios';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db';
import { otpSessions } from '../db/schema';

if (!process.env.FAST2SMS_API_KEY) {
  throw new Error('FAST2SMS_API_KEY environment variable is required');
}

const MAX_OTP_ATTEMPTS = 5;

function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

export async function sendOtp(phone: string): Promise<void> {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Delete any existing OTP for this phone
  await db.delete(otpSessions).where(eq(otpSessions.phone, phone));

  // Store new OTP
  await db.insert(otpSessions).values({ phone, code, expiresAt });

  // Send via Fast2SMS
  const phoneDigits = phone.replace(/^\+91/, ''); // strip +91 prefix
  try {
    await axios.get('https://www.fast2sms.com/dev/bulkV2', {
      params: {
        authorization: process.env.FAST2SMS_API_KEY,
        variables_values: code,
        route: 'otp',
        numbers: phoneDigits,
      },
      headers: { 'cache-control': 'no-cache' },
    });
  } catch (err) {
    // Rollback: remove the OTP we just stored since it was never delivered
    await db.delete(otpSessions).where(eq(otpSessions.phone, phone));
    console.error('Fast2SMS dispatch failed:', (err as Error).message);
    throw new Error('Failed to send OTP. Please try again later.');
  }
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const [session] = await db
    .select()
    .from(otpSessions)
    .where(
      and(
        eq(otpSessions.phone, phone),
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
  if (session.code !== code) {
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
