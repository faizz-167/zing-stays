'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.replace('/auth');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-content mx-auto px-6 py-12">
      <div className="flex gap-2 mb-10 border-b border-border pb-4">
        {[
          { href: '/dashboard', label: 'Overview' },
          { href: '/dashboard/listings', label: 'My Rooms' },
          { href: '/dashboard/favorites', label: 'Saved' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="font-mono text-xs uppercase tracking-[0.1em] px-4 py-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
