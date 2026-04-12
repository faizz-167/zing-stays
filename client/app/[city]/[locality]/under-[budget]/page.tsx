import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import SeoListingCard from '@/components/seo/SeoListingCard';
import SeoPageTracker from '@/components/seo/SeoPageTracker';
import type { ListingCardData } from '@/lib/types';

export const revalidate = 3600;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const VALID_BANDS = ['under-5000', 'under-8000', 'under-10000', 'under-15000', 'under-20000'] as const;

interface BudgetPageData {
  city: { id: number; name: string; slug: string };
  locality: { id: number; name: string; slug: string };
  band: string;
  maxPrice: number;
  stats: { totalListings: number; avgPrice: number; minPrice: number; maxPrice: number };
  listings: (ListingCardData & { foodIncluded: boolean })[];
  otherBands: string[];
  meta: { title: string; description: string };
}

async function getBudgetData(
  citySlug: string,
  localitySlug: string,
  band: string,
): Promise<BudgetPageData | null> {
  const res = await fetch(
    `${API_URL}/seo/locality/${citySlug}/${localitySlug}/budget/${band}`,
    { next: { revalidate: 3600 } },
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json() as Promise<BudgetPageData>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; locality: string; budget: string }>;
}): Promise<Metadata> {
  const { city: citySlug, locality: localitySlug, budget } = await params;
  const data = await getBudgetData(citySlug, localitySlug, budget);

  if (!data) {
    return { title: 'Not Found | ZingBrokers' };
  }

  return {
    title: data.meta.title,
    description: data.meta.description,
    alternates: {
      canonical: `https://zingbrokers.com/${citySlug}/${localitySlug}/${budget}`,
    },
    robots: { index: true, follow: true },
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function BudgetBandPage({
  params,
}: {
  params: Promise<{ city: string; locality: string; budget: string }>;
}) {
  const { city: citySlug, locality: localitySlug, budget } = await params;

  if (!VALID_BANDS.includes(budget as (typeof VALID_BANDS)[number])) {
    notFound();
  }

  const data = await getBudgetData(citySlug, localitySlug, budget);
  if (!data) notFound();

  const { city, locality, maxPrice, stats, listings, otherBands } = data;

  const listingCards: ListingCardData[] = listings.map((l) => ({
    ...l,
    badges: [],
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: data.meta.title,
    numberOfItems: stats.totalListings,
    itemListElement: listings.slice(0, 10).map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://zingbrokers.com/listings/${l.id}`,
      name: l.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SeoPageTracker
        city={city.name}
        citySlug={city.slug}
        locality={locality.name}
        localitySlug={locality.slug}
        pageType="seo_budget_band"
      />
      <div className="max-w-content mx-auto px-6 py-12 space-y-12">
        {/* Breadcrumb */}
        <nav className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <a href={`/${city.slug}`} className="hover:text-foreground transition-colors">
            {city.name}
          </a>
          <span>/</span>
          <a href={`/${city.slug}/${locality.slug}`} className="hover:text-foreground transition-colors">
            {locality.name}
          </a>
          <span>/</span>
          <span>Under ₹{maxPrice.toLocaleString('en-IN')}</span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="font-display text-4xl leading-tight mb-4">
            Rooms under ₹{maxPrice.toLocaleString('en-IN')}/mo in {locality.name},{' '}
            {city.name}
          </h1>
          {stats.totalListings > 0 && (
            <div className="flex flex-wrap gap-6 font-sans text-sm text-muted-foreground">
              <span>{stats.totalListings} listings</span>
              {stats.avgPrice > 0 && (
                <span>Avg ₹{stats.avgPrice.toLocaleString('en-IN')}/mo</span>
              )}
            </div>
          )}
        </div>

        {/* Listings grid */}
        {listingCards.length > 0 ? (
          <div>
            <h2 className="font-display text-2xl mb-6">
              Affordable Listings in {locality.name}
            </h2>
            <div className="space-y-6">
              {listingCards.map((l) => (
                <SeoListingCard
                  key={l.id}
                  listing={l}
                  city={city.name}
                  locality={locality.name}
                  pageType="seo_budget_band"
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="font-sans text-muted-foreground">
            No listings found under ₹{maxPrice.toLocaleString('en-IN')} in {locality.name}.
          </p>
        )}

        {/* Other budget bands */}
        {otherBands.length > 0 && (
          <div>
            <h2 className="font-display text-xl mb-4">Browse Other Budgets</h2>
            <div className="flex flex-wrap gap-3">
              {otherBands.map((b) => {
                const price = parseInt(b.replace('under-', ''), 10);
                return (
                  <a
                    key={b}
                    href={`/${city.slug}/${locality.slug}/${b}`}
                    className="rounded-lg border border-border px-4 py-2 font-sans text-sm hover:border-accent hover:text-accent transition-colors"
                  >
                    Under ₹{price.toLocaleString('en-IN')}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Back to locality */}
        <div>
          <a
            href={`/${city.slug}/${locality.slug}`}
            className="font-sans text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            ← All listings in {locality.name}
          </a>
        </div>
      </div>
    </>
  );
}
