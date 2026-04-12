import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import LocalityLinks from '@/components/seo/LocalityLinks';
import BudgetBandLinks from '@/components/seo/BudgetBandLinks';
import SeoListingCard from '@/components/seo/SeoListingCard';
import SeoPageTracker from '@/components/seo/SeoPageTracker';
import ListingsTopBar from '@/components/search/ListingsTopBar';
import type { ListingCardData } from '@/lib/types';

export const revalidate = 3600;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface CityLocality {
  id: number;
  name: string;
  slug: string;
  listingCount: number;
}

interface PropertyTypeStat {
  type: string;
  count: number;
}

interface CityPageData {
  city: { id: number; name: string; slug: string; state: string | null };
  stats: { totalListings: number; avgPrice: number; minPrice: number; maxPrice: number };
  listings: (ListingCardData & { foodIncluded: boolean })[];
  localities: CityLocality[];
  propertyTypes: PropertyTypeStat[];
  meta: { title: string; description: string };
}

async function getCityData(citySlug: string): Promise<CityPageData | null> {
  const res = await fetch(`${API_URL}/seo/city/${citySlug}`, {
    next: { revalidate: 3600 },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json() as Promise<CityPageData>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: citySlug } = await params;
  const data = await getCityData(citySlug);

  if (!data) {
    return { title: 'City Not Found | ZingBrokers' };
  }

  return {
    title: data.meta.title,
    description: data.meta.description,
    alternates: {
      canonical: `https://zingbrokers.com/${citySlug}`,
    },
    robots: { index: true, follow: true },
  };
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/cities`);
    if (!res.ok) return [];
    const { data } = (await res.json()) as { data: { slug: string }[] };
    return data.map((c) => ({ city: c.slug }));
  } catch {
    return [];
  }
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: citySlug } = await params;
  const data = await getCityData(citySlug);
  if (!data) notFound();

  const { city, stats, listings, localities, propertyTypes } = data;

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
      <SeoPageTracker city={city.name} citySlug={city.slug} pageType="seo_city" />
      <div className="max-w-content mx-auto px-6 py-12 space-y-12">
        <ListingsTopBar initialCity={{ id: city.id, name: city.name, slug: city.slug }} />
        {/* Header */}
        <div>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-2">
            {city.state ?? 'India'}
          </p>
          <h1 className="font-display text-4xl leading-tight mb-4">
            Rooms & PG in {city.name}
          </h1>
          {stats.totalListings > 0 && (
            <div className="flex flex-wrap gap-6 font-sans text-sm text-muted-foreground">
              <span>{stats.totalListings} listings</span>
              {stats.avgPrice > 0 && (
                <span>Avg ₹{stats.avgPrice.toLocaleString('en-IN')}/mo</span>
              )}
              {stats.minPrice > 0 && (
                <span>
                  ₹{stats.minPrice.toLocaleString('en-IN')} – ₹
                  {stats.maxPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Listings grid */}
        {listingCards.length > 0 ? (
          <div>
            <h2 className="font-display text-2xl mb-6">Latest Listings in {city.name}</h2>
            <div className="space-y-6">
              {listingCards.map((l) => (
                <SeoListingCard key={l.id} listing={l} city={city.name} pageType="seo_city" />
              ))}
            </div>
          </div>
        ) : (
          <p className="font-sans text-muted-foreground">No active listings in {city.name} yet.</p>
        )}

        {/* Property type links */}
        {propertyTypes.length > 0 && (
          <div>
            <h2 className="font-display text-xl mb-4">Browse by Type</h2>
            <div className="flex flex-wrap gap-3">
              {propertyTypes.map(({ type, count }) => (
                <a
                  key={type}
                  href={`/listings?cityId=${city.id}&propertyType=${type}`}
                  className="px-4 py-2 border border-border rounded-lg font-sans text-sm hover:border-accent hover:text-accent transition-colors"
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                  {count > 0 && <span className="ml-1 text-muted-foreground">({count})</span>}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Locality links */}
        {localities.length > 0 && (
          <LocalityLinks citySlug={city.slug} localities={localities} />
        )}

        {/* Budget band links */}
        {stats.minPrice > 0 && (
          <BudgetBandLinks
            cityId={city.id}
            minPrice={stats.minPrice}
            maxPrice={stats.maxPrice}
          />
        )}
      </div>
    </>
  );
}
