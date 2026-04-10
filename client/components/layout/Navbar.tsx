'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <nav className="max-w-content mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-foreground">
          ZindStay
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/listings" className="font-sans text-sm font-medium tracking-[0.05em] text-muted-foreground hover:text-foreground transition-colors">
            Browse Rooms
          </Link>
          {isAuthenticated && (
            <Link href="/dashboard" className="font-sans text-sm font-medium tracking-[0.05em] text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="hidden md:flex flex-col items-end gap-0.5">
                <span className="font-sans text-sm text-foreground leading-tight">
                  {user?.name || user?.email}
                </span>
                {user?.isPosterVerified ? (
                  <span className="font-mono text-xs text-emerald-600 uppercase tracking-[0.1em]">
                    Verified Poster
                  </span>
                ) : (
                  <Link
                    href="/dashboard/verify"
                    className="font-mono text-xs text-amber-600 hover:text-amber-700 uppercase tracking-[0.1em] transition-colors"
                  >
                    Get Verified
                  </Link>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>Sign Out</Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="font-sans text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className={cn(
                  'inline-flex items-center justify-center font-sans font-medium touch-manipulation transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'min-h-[44px] px-4 py-2 text-sm',
                  'bg-accent text-accent-foreground rounded-md shadow-sm hover:bg-accent-secondary hover:shadow-md active:translate-y-0',
                )}
              >
                Register
              </Link>
            </div>
          )}
          <Link
            href="/dashboard/listings/new"
            className={cn(
              'inline-flex items-center justify-center font-sans font-medium touch-manipulation transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'min-h-[44px] px-4 py-2 text-sm',
              'bg-transparent border border-foreground text-foreground rounded-md hover:bg-muted hover:border-accent hover:text-accent',
            )}
          >
            + Post Room
          </Link>
        </div>
      </nav>
    </header>
  );
}
