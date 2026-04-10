import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
import * as schema from '../db/schema';
import { db } from '../db';

const APP_NAME = process.env.APP_NAME ?? 'ZingBrokers';
const SERVER_URL = process.env.BETTER_AUTH_URL ?? process.env.SERVER_URL ?? 'http://localhost:4000';
const CLIENT_URL = process.env.CLIENT_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BCRYPT_ROUNDS = 12;

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
const OTP_DEV_CONSOLE_FALLBACK = process.env.OTP_DEV_CONSOLE_FALLBACK === 'true';

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

async function sendOtpEmail(email: string, otp: string, type: string): Promise<void> {
  const text = OTP_EMAIL_TEXT_TEMPLATE.replaceAll('{CODE}', otp);

  if (!transporter || !OTP_EMAIL_FROM) {
    if (OTP_DEV_CONSOLE_FALLBACK && process.env.NODE_ENV !== 'production') {
      console.warn(`Email OTP fallback for ${email} (${type}): ${otp}`);
      return;
    }

    throw new Error('SMTP is not configured');
  }

  await transporter.sendMail({
    from: OTP_EMAIL_FROM,
    to: email,
    subject: OTP_EMAIL_SUBJECT,
    text,
  });
}

export const auth = betterAuth({
  appName: APP_NAME,
  baseURL: SERVER_URL,
  trustedOrigins: [CLIENT_URL, process.env.FRONTEND_URL, process.env.CLIENT_URL].filter(
    (origin): origin is string => Boolean(origin),
  ),
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    usePlural: true,
  }),
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    trustedProxyHeaders: true,
    database: {
      generateId: 'serial',
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    password: {
      hash: async (password) => bcrypt.hash(password, BCRYPT_ROUNDS),
      verify: async ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  socialProviders: GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined,
  user: {
    additionalFields: {
      phone: {
        type: 'string',
        required: false,
      },
      posterEmailVerified: {
        type: 'boolean',
        required: false,
        input: false,
        defaultValue: false,
      },
      isPosterVerified: {
        type: 'boolean',
        required: false,
        input: false,
        defaultValue: false,
      },
      isAdmin: {
        type: 'boolean',
        required: false,
        input: false,
        defaultValue: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const fallbackName =
            typeof user.name === 'string' && user.name.trim().length > 0
              ? user.name
              : String(user.email).split('@')[0] ?? 'User';

          return {
            data: {
              ...user,
              name: fallbackName,
              isAdmin: user.email === ADMIN_EMAIL,
              posterEmailVerified: false,
              isPosterVerified: false,
            },
          };
        },
      },
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        await sendOtpEmail(email, otp, type);
      },
    }),
  ],
});
