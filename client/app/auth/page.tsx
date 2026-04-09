'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import OtpModal from '@/components/auth/OtpModal';

export default function AuthPage() {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isReady && isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, isReady, router]);

  if (!isReady || isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <OtpModal onSuccess={() => router.replace('/dashboard')} />
    </div>
  );
}
