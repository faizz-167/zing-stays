'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';

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
              <span className="hidden md:block font-sans text-sm text-muted-foreground">{user?.name || user?.email}</span>
              <Button variant="ghost" size="sm" onClick={logout}>Sign Out</Button>
            </>
          ) : (
            <Link href="/auth">
              <Button size="sm">Sign In</Button>
            </Link>
          )}
          <Link href="/dashboard/listings/new">
            <Button variant="secondary" size="sm">+ Post Room</Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
