import Link from 'next/link';
import Image from 'next/image';
import { Search, Shield, Phone, ArrowRight } from 'lucide-react';
import GuidedSearchWidget from '@/components/search/GuidedSearchWidget';
import SectionLabel from '@/components/ui/SectionLabel';
import { buttonClassName } from '@/components/ui/Button';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/Motion';
import Card from '@/components/ui/Card';

import heroImage from '@/assets/lissete-laverde-7OFTxbGWqwk-unsplash.jpg';
import type { ListingCardData } from '@/lib/types';
import ListingCard from '@/components/listings/ListingCard';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Search Your City',
    desc: 'Enter your city, locality, or nearby landmark to find available rooms instantly.',
    icon: Search,
  },
  {
    step: '02',
    title: 'Browse & Filter',
    desc: 'Filter by price, room type, amenities, and gender preference to narrow your choices.',
    icon: Shield,
  },
  {
    step: '03',
    title: 'Contact Owner',
    desc: 'Verify your email once and get direct access to owner contact details.',
    icon: Phone,
  },
];

const POPULAR_CITIES = [
  { name: 'Mumbai', slug: 'mumbai' },
  { name: 'Bangalore', slug: 'bangalore' },
  { name: 'Delhi', slug: 'delhi' },
  { name: 'Pune', slug: 'pune' },
  { name: 'Hyderabad', slug: 'hyderabad' },
];

export default async function HomePage() {
  let featuredListings: ListingCardData[] = [];
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const res = await fetch(`${apiUrl}/listings?limit=3&status=active`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      featuredListings = data.data ?? [];
    }
  } catch (error) {
    console.error('Failed to fetch featured listings:', error);
  }

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative z-30 min-h-[88vh] flex flex-col justify-center">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image
            src={heroImage}
            alt="Modern residential property"
            fill
            className="object-cover"
            priority
            quality={90}
            placeholder="blur"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/92 via-background/72 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/20" />
          {/* Diagonal geometric overlay */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(
                -55deg,
                transparent,
                transparent 60px,
                rgba(184,134,11,0.028) 60px,
                rgba(184,134,11,0.028) 61px
              )`,
            }}
          />
        </div>

        {/* Floating decorative orb */}
        <div
          className="absolute right-[8%] top-[20%] w-64 h-64 rounded-full pointer-events-none hidden lg:block"
          style={{
            background: 'radial-gradient(circle, rgba(184,134,11,0.07) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        <div className="relative z-10 max-w-content mx-auto px-6 py-16 md:py-24 w-full">
          {/* Headline area */}
          <div className="text-center mb-10">
            <FadeIn delay={0.1} className="mb-5">
              <span className="inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-accent bg-accent/10 px-4 py-2 rounded-full border border-accent/25">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Student &amp; Bachelor Housing
                <span className="text-accent/40">◆</span>
                India
              </span>
            </FadeIn>

            <FadeIn delay={0.2}>
              <h1 className="font-display text-[2.6rem] md:text-[3.8rem] lg:text-[4.4rem] font-bold leading-[1.03] tracking-[-0.025em] text-foreground mb-5">
                Find Your Perfect{' '}
                <span
                  className="text-accent relative inline-block"
                  style={{ textShadow: '0 0 60px rgba(184,134,11,0.15)' }}
                >
                  Room
                </span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.3}>
              <p className="font-sans text-base md:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                Verified PGs, hostels, and shared accommodations with transparent pricing and direct owner contact.
              </p>
            </FadeIn>
          </div>

          {/* Search Card — centered, elevated */}
          <FadeIn delay={0.4} className="relative z-20">
            <div className="flex justify-center">
              <GuidedSearchWidget />
            </div>
          </FadeIn>

          {/* Popular cities — below search */}
          <FadeIn delay={0.5} className="flex items-center justify-center gap-2 flex-wrap mt-7">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em] mr-1">
              Popular:
            </span>
            {POPULAR_CITIES.map(({ name, slug }, i) => (
              <span key={slug} className="flex items-center gap-2">
                {i > 0 && <span className="text-border text-xs">·</span>}
                <Link
                  href={`/${slug}`}
                  className="font-sans text-sm text-muted-foreground hover:text-accent transition-colors duration-200"
                >
                  {name}
                </Link>
              </span>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="border-y border-border bg-gradient-to-r from-muted/20 via-muted/40 to-muted/20 relative overflow-hidden">
        {/* Subtle horizontal line accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        <div className="max-w-content mx-auto px-6 py-7">
          <StaggerContainer className="flex flex-col sm:flex-row items-center justify-center divide-y sm:divide-y-0 sm:divide-x divide-border/60">
            {[
              { value: '10K+', label: 'Verified Listings' },
              { value: '50+', label: 'Cities Covered' },
              { value: '25K+', label: 'Happy Tenants' },
              { value: '4.8★', label: 'Average Rating' },
            ].map(({ value, label }) => (
              <StaggerItem key={label} className="text-center px-8 py-3 sm:py-0 relative group">
                <div className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight group-hover:text-accent transition-colors duration-300">
                  {value}
                </div>
                <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.18em] mt-1">
                  {label}
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      </section>

      {/* ─── Featured Properties ─── */}
      <section className="py-16 md:py-24 px-6">
        <StaggerContainer className="max-w-content mx-auto">
          <StaggerItem>
            <SectionLabel>Featured</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl text-center mb-3">
              Popular Rooms Near You
            </h2>
            <p className="font-sans text-muted-foreground text-center mb-10 max-w-lg mx-auto">
              Hand-picked verified rooms from top-rated owners across India.
            </p>
          </StaggerItem>

          <div className="grid md:grid-cols-3 gap-6">
            {featuredListings.map((listing) => (
              <StaggerItem key={listing.id}>
                <ListingCard listing={listing} variant="compact" />
              </StaggerItem>
            ))}
            {featuredListings.length === 0 && (
              <div className="col-span-3 text-center py-10 text-muted-foreground">
                No featured properties available right now.
              </div>
            )}
          </div>

          <StaggerItem className="text-center mt-8">
            <Link
              href="/listings"
              className={buttonClassName({ variant: 'secondary', size: 'md' })}
            >
              View All Listings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </StaggerItem>
        </StaggerContainer>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-16 md:py-24 px-6 border-t border-border relative overflow-hidden">
        {/* Decorative background text */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          aria-hidden="true"
        >
          <span
            className="font-display text-[20rem] font-bold leading-none tracking-tighter text-foreground/[0.015]"
          >
            How
          </span>
        </div>
        <StaggerContainer className="max-w-content mx-auto relative z-10">
          <StaggerItem>
            <SectionLabel>How It Works</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl text-center mb-12">
              Simple. Fast. Transparent.
            </h2>
          </StaggerItem>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {HOW_IT_WORKS.map(({ step, title, desc, icon: Icon }) => (
              <StaggerItem key={step}>
                <div className="flex flex-col items-start relative group">
                  {/* Giant ghost step number */}
                  <div
                    className="absolute -top-4 -left-2 font-display text-8xl font-bold leading-none text-foreground/[0.04] select-none pointer-events-none transition-all duration-500 group-hover:text-accent/[0.06]"
                    aria-hidden="true"
                  >
                    {step}
                  </div>
                  <div className="relative z-10">
                    <div className="w-11 h-11 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center mb-5 group-hover:bg-accent/15 group-hover:border-accent/25 transition-all duration-300">
                      <Icon className="h-4.5 w-4.5 text-accent" />
                    </div>
                    <span className="font-mono text-[10px] text-accent uppercase tracking-[0.18em] mb-2 block">
                      Step {step}
                    </span>
                    <h3 className="font-display text-xl mb-2.5">{title}</h3>
                    <p className="font-sans text-muted-foreground leading-relaxed text-sm">
                      {desc}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-16 md:py-24 px-6 border-t border-border overflow-hidden">
        {/* Layered glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(184,134,11,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }}
          />
          <div
            className="absolute left-[20%] top-[30%] w-[200px] h-[200px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(184,134,11,0.04) 0%, transparent 70%)', filter: 'blur(40px)' }}
          />
        </div>
        {/* Diagonal grid lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 80px,
              rgba(184,134,11,0.018) 80px,
              rgba(184,134,11,0.018) 81px
            )`,
          }}
        />
        <FadeIn className="max-w-content mx-auto text-center relative z-10">
          <SectionLabel>For Property Owners</SectionLabel>
          <h2 className="font-display text-3xl md:text-[2.8rem] font-bold mb-5 leading-tight">
            List Your Room in Minutes
          </h2>
          <p className="font-sans text-base md:text-lg text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
            Post your PG, hostel, or room for free. Reach thousands of students
            looking for their next home.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard/listings/new"
              className={buttonClassName({ size: 'lg' })}
            >
              Post a Room — It&apos;s Free
            </Link>
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
              No credit card required
            </span>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
