'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { emailSchema, otpSchema } from '@/lib/schemas/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface OtpModalProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function OtpModal({ onSuccess, onClose }: OtpModalProps) {
  const { login } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: result.data.email });
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = otpSchema.safeParse({ code });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ user: Parameters<typeof login>[0] }>(
        '/auth/verify-otp',
        { email, code },
      );
      login(res.user);
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
      <div className="relative bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-accent">Secure Login</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <h2 className="font-display text-3xl mb-2">
            {step === 'email' ? 'Enter Your Email' : 'Verify OTP'}
          </h2>
          <p className="font-sans text-muted-foreground text-sm">
            {step === 'email'
              ? "We'll send a 6-digit code to verify your email."
              : `Code sent to ${email}. Check your inbox.`}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            {error && <p className="font-sans text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground mb-2 block">
                6-Digit Code
              </label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                className="text-center text-2xl tracking-[0.5em]"
              />
            </div>
            {error && <p className="font-sans text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setStep('email');
                setCode('');
                setError('');
              }}
            >
              Change email
            </Button>
          </form>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground font-mono text-xs uppercase tracking-wider transition-colors"
          >
            &#x2715;
          </button>
        )}
      </div>
    </div>
  );
}
