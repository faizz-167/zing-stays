import Link from 'next/link';
import { Heart } from 'lucide-react';
import { redirect } from 'next/navigation';
import { requireServerUser } from '@/lib/server-auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireServerUser();
  if (!user) {
    redirect('/auth');
  }

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
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.1em] px-4 py-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {href === '/dashboard/favorites' ? (
              <>
                <Heart className="h-4 w-4" />
                <span className="sr-only">Saved</span>
              </>
            ) : (
              label
            )}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
