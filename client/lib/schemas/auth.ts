import { z } from 'zod';

export const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

export const otpSchema = z.object({
  code: z.string().length(6, 'Enter 6-digit OTP'),
});

export type EmailInput = z.infer<typeof emailSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
