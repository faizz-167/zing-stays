'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { otpSchema, phoneSchema, type OtpInput, type PhoneInput } from '@/lib/schemas/auth';
import type { AuthUser } from '@/lib/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import SectionLabel from '@/components/ui/SectionLabel';

type Step = 'otp-send' | 'otp-verify' | 'phone';

export default function VerifyPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(user?.posterEmailVerified ? 'phone' : 'otp-send');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const otpForm = useForm<OtpInput>({ resolver: zodResolver(otpSchema) });
  const phoneForm = useForm<PhoneInput>({ resolver: zodResolver(phoneSchema) });

  useEffect(() => {
    if (user?.isPosterVerified) {
      router.replace('/dashboard/listings/new');
    }
  }, [router, user?.isPosterVerified]);

  if (user?.isPosterVerified) return null;

  const sendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/account/send-otp', {});
      setStep('otp-verify');
      setOtpSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async ({ code }: OtpInput) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ user: AuthUser }>('/account/verify-otp', { code });
      login(res.user);
      if (res.user.isPosterVerified) {
        router.replace('/dashboard/listings/new');
      } else {
        setStep('phone');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const savePhone = async ({ phone }: PhoneInput) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.patch<{ user: AuthUser }>('/account/profile', { phone });
      login(res.user);
      router.replace('/dashboard/listings/new');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save phone number');
    } finally {
      setLoading(false);
    }
  };

  const stepLabel = step === 'otp-send' || step === 'otp-verify' ? 'Step 1 of 2' : 'Step 2 of 2';
  const stepTitle =
    step === 'otp-send' ? 'Verify Your Email' :
    step === 'otp-verify' ? 'Enter OTP Code' :
    'Add Phone Number';

  return (
    <div>
      <SectionLabel>Verification</SectionLabel>
      <h1 className="font-display text-3xl mb-10">Become a Verified Poster</h1>

      <div className="max-w-md">
        <div className="bg-card border border-border rounded-xl p-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px flex-1 bg-border" />
              <span className="font-mono text-xs uppercase tracking-[0.15em] text-accent">{stepLabel}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <p className="font-sans text-muted-foreground text-sm">
              Complete verification to publish your listing.
            </p>
          </div>

          <h2 className="font-sans font-semibold text-base mb-4">{stepTitle}</h2>

          {step === 'otp-send' && (
            <div className="space-y-4">
              <p className="font-sans text-sm text-muted-foreground">
                We&apos;ll send a 6-digit code to <strong>{user?.email}</strong> to verify your email address.
              </p>
              {error && <p className="font-sans text-sm text-red-600">{error}</p>}
              <Button className="w-full" onClick={sendOtp} disabled={loading}>
                {loading ? 'Sending...' : 'Send Verification Code'}
              </Button>
            </div>
          )}

          {step === 'otp-verify' && (
            <form onSubmit={otpForm.handleSubmit(verifyOtp)} className="space-y-4">
              <p className="font-sans text-sm text-muted-foreground">
                Code sent to <strong>{user?.email}</strong>. Check your inbox.
              </p>
              <div>
                <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                  6-Digit Code
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  className="text-center text-2xl tracking-[0.5em]"
                  {...otpForm.register('code', {
                    setValueAs: (v) => typeof v === 'string' ? v.replace(/\D/g, '') : v,
                  })}
                  autoFocus
                />
                {otpForm.formState.errors.code && (
                  <p className="font-sans text-sm text-red-600 mt-1">{otpForm.formState.errors.code.message}</p>
                )}
              </div>
              {error && <p className="font-sans text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Email'}
              </Button>
              {otpSent && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => { setStep('otp-send'); otpForm.reset(); setError(''); }}
                >
                  Resend code
                </Button>
              )}
            </form>
          )}

          {step === 'phone' && (
            <form onSubmit={phoneForm.handleSubmit(savePhone)} className="space-y-4">
              <p className="font-sans text-sm text-muted-foreground">
                Add your phone number so renters can contact you.
              </p>
              <div>
                <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="+91XXXXXXXXXX"
                  {...phoneForm.register('phone')}
                  autoFocus
                />
                {phoneForm.formState.errors.phone && (
                  <p className="font-sans text-sm text-red-600 mt-1">{phoneForm.formState.errors.phone.message}</p>
                )}
              </div>
              {error && <p className="font-sans text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Saving...' : 'Save & Continue'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
