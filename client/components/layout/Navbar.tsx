'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Heart, Menu, X, User, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';



export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = () => setUserMenuOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [userMenuOpen]);

  const toggleMobile = useCallback(() => setMobileOpen(prev => !prev), []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const postRoomHref =
    isAuthenticated && user?.isPosterVerified
      ? '/dashboard/listings/new'
      : '/dashboard/verify';

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={cn(
          'sticky top-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border/60 shadow-sm'
            : 'bg-background/95 backdrop-blur border-b border-transparent',
        )}
      >
        {/* Gold accent top bar */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
        <nav className="max-w-content mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link
            href="/"
            className="font-display text-xl font-semibold tracking-tight text-foreground hover:text-accent transition-colors duration-200 flex-shrink-0 group"
          >
            Zing<span className="text-accent group-hover:text-accent-secondary transition-colors duration-200">Brokers</span>
          </Link>



          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              /* Authenticated User Menu */
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setUserMenuOpen(p => !p)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-1.5 rounded-full transition-all duration-200',
                    'border border-border hover:border-accent/40 hover:shadow-sm',
                    userMenuOpen && 'border-accent/40 shadow-sm bg-muted/50',
                  )}
                >
                  <span className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-3.5 w-3.5 text-accent" />
                  </span>
                  <span className="font-sans text-sm font-medium text-foreground max-w-[120px] truncate">
                    {user?.name || user?.email?.split('@')[0] || 'Account'}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                      userMenuOpen && 'rotate-180',
                    )}
                  />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-card border border-border shadow-lg overflow-hidden"
                    >
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-border bg-muted/30">
                        <p className="font-sans text-sm font-medium text-foreground truncate">
                          {user?.name || 'User'}
                        </p>
                        <p className="font-sans text-xs text-muted-foreground truncate">
                          {user?.email}
                        </p>
                        {user?.isPosterVerified && (
                          <span className="inline-flex items-center gap-1 mt-1 font-mono text-[10px] text-emerald-600 uppercase tracking-[0.1em]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Verified Poster
                          </span>
                        )}
                      </div>
                      {/* Menu Items */}
                      <div className="py-1">
                        <DropdownLink href="/dashboard">
                          Dashboard
                        </DropdownLink>
                        <DropdownLink href="/dashboard/favorites">
                          Saved Rooms
                        </DropdownLink>
                        <DropdownLink href="/dashboard/listings">
                          My Listings
                        </DropdownLink>
                      </div>
                      {/* Logout */}
                      <div className="border-t border-border py-1">
                        <button
                          onClick={logout}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 font-sans text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="font-sans text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted/50"
                >
                  Sign In
                </Link>
                <Link href="/auth/register">
                  <Button size="sm">Register</Button>
                </Link>
              </div>
            )}

            {/* Post Room CTA */}
            <Link href={postRoomHref}>
              <Button variant="secondary" size="sm">
                + Post Room
              </Button>
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={toggleMobile}
            className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            <AnimatePresence mode="wait">
              {mobileOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="h-5 w-5 text-foreground" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Menu className="h-5 w-5 text-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </nav>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 md:hidden"
              onClick={toggleMobile}
            />

            {/* Slide-down panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed top-16 left-0 right-0 z-40 md:hidden bg-background border-b border-border shadow-lg"
            >
              <div className="max-w-content mx-auto px-6 py-6 flex flex-col gap-1">


                {/* Auth + CTA */}
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2 mb-2">
                      <span className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-accent" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-sans text-sm font-medium text-foreground truncate">
                          {user?.name || user?.email?.split('@')[0]}
                        </p>
                        {user?.isPosterVerified && (
                          <p className="font-mono text-[10px] text-emerald-600 uppercase tracking-[0.1em]">
                            Verified
                          </p>
                        )}
                      </div>
                    </div>
                    <Link href={postRoomHref} className="w-full">
                      <Button variant="primary" size="sm" className="w-full">
                        + Post Room
                      </Button>
                    </Link>
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 w-full px-3 py-2.5 mt-1 font-sans text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Link href="/auth/login" className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full">
                          Sign In
                        </Button>
                      </Link>
                      <Link href="/auth/register" className="flex-1">
                        <Button size="sm" className="w-full">
                          Register
                        </Button>
                      </Link>
                    </div>
                    <Link href={postRoomHref} className="w-full mt-2">
                      <Button variant="secondary" size="sm" className="w-full">
                        + Post Room
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Sub-components ─── */

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'relative px-3.5 py-2 font-sans text-sm font-medium tracking-[0.02em] rounded-lg transition-all duration-200',
        active
          ? 'text-accent'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
      )}
    >
      {children}
      {active && (
        <motion.span
          layoutId="nav-indicator"
          className="absolute bottom-0 left-3 right-3 h-[2px] bg-accent rounded-full"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </Link>
  );
}

function MobileNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center px-3 py-2.5 rounded-lg font-sans text-sm font-medium transition-all duration-200',
        active
          ? 'text-accent bg-accent/5'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
      )}
    >
      {children}
    </Link>
  );
}

function DropdownLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block px-4 py-2.5 font-sans text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
    >
      {children}
    </Link>
  );
}
