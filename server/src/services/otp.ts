import axios from 'axios';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db';
import { otpSessions } from '../db/schema';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
  await axios.get('https://www.fast2sms.com/dev/bulkV2', {
    params: {
      authorization: process.env.FAST2SMS_API_KEY,
      variables_values: code,
      route: 'otp',
      numbers: phoneDigits,
    },
    headers: { 'cache-control': 'no-cache' },
  });
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const [session] = await db
    .select()
    .from(otpSessions)
    .where(
      and(
        eq(otpSessions.phone, phone),
        eq(otpSessions.code, code),
        gt(otpSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!session) return false;

  // Delete used OTP
  await db.delete(otpSessions).where(eq(otpSessions.id, session.id));
  return true;
}
