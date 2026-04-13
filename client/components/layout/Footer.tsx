import Link from 'next/link';
import { Mail, ArrowUpRight } from 'lucide-react';

const FOOTER_LINKS = [
  { href: '/listings', label: 'Browse Rooms' },
  { href: '/dashboard/listings/new', label: 'Post Room' },
  { href: '/auth/register', label: 'Register' },
];

const QUICK_CITIES = [
  { href: '/mumbai', label: 'Mumbai' },
  { href: '/bangalore', label: 'Bangalore' },
  { href: '/delhi', label: 'Delhi' },
  { href: '/pune', label: 'Pune' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border mt-24 bg-gradient-to-b from-muted/40 to-muted/20 relative">
      {/* Top gold accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="max-w-content mx-auto px-6 py-16">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <Link
              href="/"
              className="font-display text-2xl font-semibold text-foreground hover:text-accent transition-colors duration-200 group"
            >
              Zing<span className="text-accent group-hover:text-accent-secondary transition-colors duration-200">Brokers</span>
            </Link>
            <p className="font-sans text-sm text-muted-foreground mt-3 max-w-xs leading-relaxed">
              India&apos;s student and bachelor-focused rental marketplace. Verified listings,
              transparent pricing, direct owner contact.
            </p>
            <a
              href="mailto:hello@zingbrokers.com"
              className="inline-flex items-center gap-2 mt-4 font-sans text-sm text-muted-foreground hover:text-accent transition-colors group"
            >
              <Mail className="h-3.5 w-3.5" />
              hello@zingbrokers.com
              <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-mono text-xs font-medium uppercase tracking-[0.15em] text-accent mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cities */}
          <div>
            <h4 className="font-mono text-xs font-medium uppercase tracking-[0.15em] text-accent mb-4">
              Popular Cities
            </h4>
            <ul className="space-y-2.5">
              {QUICK_CITIES.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="font-sans text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
            © {currentYear} ZingBrokers. All rights reserved.
          </p>
          <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.12em]">
            <span>Affordable rooms</span>
            <span className="text-accent/40">◆</span>
            <span>Students &amp; Bachelors</span>
            <span className="text-accent/40">◆</span>
            <span>India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
