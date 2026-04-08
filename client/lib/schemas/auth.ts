import { z } from 'zod';

export const phoneSchema = z.object({
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Enter a valid Indian phone number (+91XXXXXXXXXX)'),
});

export const otpSchema = z.object({
  code: z.string().length(6, 'Enter 6-digit OTP'),
});

export type PhoneInput = z.infer<typeof phoneSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
