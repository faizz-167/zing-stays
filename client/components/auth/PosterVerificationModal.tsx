'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { otpSchema, phoneSchema, type OtpInput, type PhoneInput } from '@/lib/schemas/auth';
import { type AuthUser } from '@/lib/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface PosterVerificationModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

type Step = 'otp-send' | 'otp-verify' | 'phone';

export default function PosterVerificationModal({ onSuccess, onClose }: PosterVerificationModalProps) {
  const { user, login } = useAuth();
  const [step, setStep] = useState<Step>(user?.emailVerified ? 'phone' : 'otp-send');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const otpForm = useForm<OtpInput>({ resolver: zodResolver(otpSchema) });
  const phoneForm = useForm<PhoneInput>({ resolver: zodResolver(phoneSchema) });

  const sendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', {});
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
      const res = await api.post<{ user: AuthUser }>('/auth/verify-otp', { code });
      login(res.user);
      if (res.user.isPosterVerified) {
        onSuccess();
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
      const res = await api.patch<{ user: AuthUser }>('/auth/profile', { phone });
      login(res.user);
      onSuccess();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
      <div className="relative bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground font-mono text-xs uppercase tracking-wider transition-colors"
        >
          &#x2715;
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-accent">{stepLabel}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <h2 className="font-display text-2xl mb-2">Become a Verified Poster</h2>
          <p className="font-sans text-muted-foreground text-sm">
            Complete verification to publish your listing.
          </p>
        </div>

        <h3 className="font-sans font-semibold text-base mb-4">{stepTitle}</h3>

        {(step === 'otp-send') && (
          <div className="space-y-4">
            <p className="font-sans text-sm text-muted-foreground">
              We'll send a 6-digit code to <strong>{user?.email}</strong> to verify your email address.
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
              {loading ? 'Saving...' : 'Save & Publish'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
