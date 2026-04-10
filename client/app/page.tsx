import Link from 'next/link';
import SearchBar from '@/components/search/SearchBar';
import SectionLabel from '@/components/ui/SectionLabel';
import { buttonClassName } from '@/components/ui/Button';

const AMENITIES = ['WiFi Included', 'Meals Provided', 'AC Room', 'Attached Bath', 'Laundry', 'CCTV Security'];
const HOW_IT_WORKS = [
  { step: '01', title: 'Search Your City', desc: 'Enter your city, locality, or nearby landmark to find available rooms instantly.' },
  { step: '02', title: 'Browse & Filter', desc: 'Filter by price, room type, amenities, and gender preference to narrow your choices.' },
  { step: '03', title: 'Contact Owner', desc: 'Verify your email once and get direct access to owner contact details.' },
];
const POPULAR_CITIES = [
  { name: 'Mumbai', slug: 'mumbai' },
  { name: 'Bangalore', slug: 'bangalore' },
  { name: 'Delhi', slug: 'delhi' },
  { name: 'Pune', slug: 'pune' },
  { name: 'Hyderabad', slug: 'hyderabad' },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative py-32 md:py-44 px-6 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-accent opacity-[0.02] blur-3xl" />
        </div>

        <div className="max-w-content mx-auto text-center relative">
          <div className="mb-8">
            <span className="font-mono text-xs font-medium uppercase tracking-[0.15em] text-accent">
              Student &amp; Bachelor Housing
            </span>
          </div>
          <h1 className="font-display text-[2.5rem] md:text-[4.5rem] leading-[1.1] tracking-[-0.02em] text-foreground mb-6">
            Find Your Perfect<br />
            <span className="text-accent">Room in India</span>
          </h1>
          <p className="font-sans text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Verified PGs, hostels, and shared accommodations with transparent pricing and direct owner contact.
          </p>
          <div className="flex justify-center mb-8">
            <SearchBar />
          </div>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-[0.1em]">Popular:</span>
            {POPULAR_CITIES.map(({ name, slug }) => (
              <Link key={slug} href={`/${slug}`} className="font-sans text-sm text-muted-foreground hover:text-accent transition-colors underline-offset-4 hover:underline decoration-accent">
                {name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32 px-6 border-t border-border">
        <div className="max-w-content mx-auto">
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="font-display text-4xl text-center mb-16">Simple. Fast. Transparent.</h2>
          <div className="grid md:grid-cols-3 gap-12">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="font-display text-5xl text-accent/30 mb-4">{step}</div>
                <h3 className="font-display text-xl mb-3">{title}</h3>
                <p className="font-sans text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="py-32 px-6 bg-muted">
        <div className="max-w-content mx-auto">
          <SectionLabel>What You Get</SectionLabel>
          <h2 className="font-display text-4xl text-center mb-16">Everything You Need</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {AMENITIES.map(amenity => (
              <div key={amenity} className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg">
                <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                <span className="font-sans text-sm">{amenity}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 border-t border-border text-center">
        <div className="max-w-content mx-auto">
          <SectionLabel>For Property Owners</SectionLabel>
          <h2 className="font-display text-4xl mb-6">List Your Room in Minutes</h2>
          <p className="font-sans text-lg text-muted-foreground mb-10 max-w-lg mx-auto">
            Post your PG, hostel, or room for free. Reach thousands of students looking for their next home.
          </p>
          <Link
            href="/dashboard/listings/new"
            className={buttonClassName({ size: 'lg' })}
          >
            Post a Room — It&apos;s Free
          </Link>
        </div>
      </section>
    </>
  );
}
