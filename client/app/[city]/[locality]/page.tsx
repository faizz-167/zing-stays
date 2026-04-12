import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import LocalityLinks from '@/components/seo/LocalityLinks';
import PropertyTypeLinks from '@/components/seo/PropertyTypeLinks';
import BudgetBandLinks from '@/components/seo/BudgetBandLinks';
import SeoListingCard from '@/components/seo/SeoListingCard';
import SeoPageTracker from '@/components/seo/SeoPageTracker';
import type { ListingCardData } from '@/lib/types';
import RentEstimator from '@/components/utilities/RentEstimator';
import PriceTrends from '@/components/utilities/PriceTrends';

export const revalidate = 3600;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const POSTHOG_API_HOST = process.env.POSTHOG_API_HOST ?? 'https://app.posthog.com';

interface NearbyLocality {
  id: number;
  name: string;
  slug: string;
  listingCount: number;
}

interface PropertyTypeStat {
  type: string;
  count: number;
}

interface GuideSummary {
  id: number;
  slug: string;
  title: string;
  type: string;
}

interface LocalityStats {
  totalListings: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

interface LocalityPageData {
  city: { id: number; name: string; slug: string };
  locality: { id: number; name: string; slug: string };
  stats: LocalityStats;
  listings: (ListingCardData & { foodIncluded: boolean })[];
  propertyTypes: PropertyTypeStat[];
  nearbyLocalities: NearbyLocality[];
  meta: { title: string; description: string };
}

/**
 * Serialize structured data for an inline <script type="application/ld+json">.
 * JSON.stringify alone is insufficient — a string value containing </script>
 * would close the script element and allow arbitrary HTML injection (XSS).
 */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/<\/script>/gi, '<\\/script>');
}

async function getCityGuides(cityId: number): Promise<GuideSummary[]> {
  try {
    const res = await fetch(`${API_URL}/content?cityId=${cityId}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return res.json() as Promise<GuideSummary[]>;
  } catch {
    return [];
  }
}

async function getLocalityData(
  citySlug: string,
  localitySlug: string,
): Promise<LocalityPageData | null> {
  const res = await fetch(`${API_URL}/seo/locality/${citySlug}/${localitySlug}`, {
    next: { revalidate: 3600 },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json() as Promise<LocalityPageData>;
}

/** Try PostHog HogQL first; fall back to listing-count endpoint if unconfigured. */
export async function generateStaticParams(): Promise<{ city: string; locality: string }[]> {
  const posthogKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;

  if (posthogKey && projectId) {
    try {
      const query = `
        SELECT
          properties.city_slug AS city_slug,
          properties.locality_slug AS locality_slug,
          count() AS views
        FROM events
        WHERE event = 'seo_page_viewed'
          AND properties.page_type = 'seo_locality'
          AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY city_slug, locality_slug
        HAVING city_slug IS NOT NULL AND city_slug != '' AND locality_slug IS NOT NULL AND locality_slug != ''
        ORDER BY views DESC
        LIMIT 100
      `;

      const res = await fetch(`${POSTHOG_API_HOST}/api/projects/${projectId}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${posthogKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
      });

      if (res.ok) {
        const data = (await res.json()) as { results: [string, string, number][] };
        const pairs = (data.results ?? [])
          .filter(([city, locality]) => city && locality)
          .map(([city, locality]) => ({ city, locality }));
        if (pairs.length > 0) return pairs;
      }
    } catch {
      // fall through to listing-count fallback below
    }
  }

  try {
    const res = await fetch(`${API_URL}/seo/top-params`);
    if (!res.ok) return [];
    return res.json() as Promise<{ city: string; locality: string }[]>;
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; locality: string }>;
}): Promise<Metadata> {
  const { city: citySlug, locality: localitySlug } = await params;
  const data = await getLocalityData(citySlug, localitySlug);

  if (!data) {
    return { title: 'Locality Not Found | ZingBrokers' };
  }

  return {
    title: data.meta.title,
    description: data.meta.description,
    alternates: {
      canonical: `https://zingbrokers.com/${citySlug}/${localitySlug}`,
    },
    robots: { index: true, follow: true },
  };
}

// ---------------------------------------------------------------------------
// Sub-components (all server-safe — no client hooks)
// ---------------------------------------------------------------------------

function StatsBar({ stats, cityName, localityName }: { stats: LocalityStats; cityName: string; localityName: string }) {
  if (stats.totalListings === 0) return null;
  return (
    <div>
      <h1 className="font-display text-4xl leading-tight mb-4">
        Rooms & PG in {localityName}, {cityName}
      </h1>
      <div className="flex flex-wrap gap-6 font-sans text-sm text-muted-foreground">
        <span>{stats.totalListings} listings</span>
        {stats.avgPrice > 0 && (
          <span>Avg ₹{stats.avgPrice.toLocaleString('en-IN')}/mo</span>
        )}
        {stats.minPrice > 0 && (
          <span>
            ₹{stats.minPrice.toLocaleString('en-IN')} – ₹{stats.maxPrice.toLocaleString('en-IN')}
          </span>
        )}
      </div>
    </div>
  );
}

function ListingsSection({
  listings,
  localityName,
  cityName,
}: {
  listings: ListingCardData[];
  localityName: string;
  cityName: string;
}) {
  if (listings.length === 0) {
    return (
      <p className="font-sans text-muted-foreground">No active listings in {localityName} yet.</p>
    );
  }
  return (
    <div>
      <h2 className="font-display text-2xl mb-6">Latest Listings in {localityName}</h2>
      <div className="space-y-6">
        {listings.map((l) => (
          <SeoListingCard
            key={l.id}
            listing={l}
            city={cityName}
            locality={localityName}
            pageType="seo_locality"
          />
        ))}
      </div>
    </div>
  );
}

function GuidesSection({ guides, cityName }: { guides: GuideSummary[]; cityName: string }) {
  if (guides.length === 0) return null;
  return (
    <div>
      <h2 className="font-display text-xl mb-4">Guides for {cityName}</h2>
      <div className="flex flex-wrap gap-3">
        {guides.map((guide) => (
          <Link
            key={guide.id}
            href={`/guides/${guide.slug}`}
            className="rounded-lg border border-border px-4 py-2 font-sans text-sm hover:border-accent hover:text-accent transition-colors"
          >
            {guide.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

function WidgetsSection({
  localityId,
}: {
  localityId: number;
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <RentEstimator localityId={localityId} apiBase={API_URL} />
      <PriceTrends localityId={localityId} apiBase={API_URL} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function LocalityPage({
  params,
}: {
  params: Promise<{ city: string; locality: string }>;
}) {
  const { city: citySlug, locality: localitySlug } = await params;
  const data = await getLocalityData(citySlug, localitySlug);
  if (!data) notFound();

  const { city, locality, stats, listings, propertyTypes, nearbyLocalities } = data;
  const guides = await getCityGuides(city.id);

  const listingCards: ListingCardData[] = listings.map((l) => ({ ...l, badges: [] }));

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
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <SeoPageTracker
        city={city.name}
        citySlug={city.slug}
        locality={locality.name}
        localitySlug={locality.slug}
        pageType="seo_locality"
      />
      <div className="max-w-content mx-auto px-6 py-12 space-y-12">
        <nav className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Link href={`/${city.slug}`} className="hover:text-foreground transition-colors">
            {city.name}
          </Link>
          <span>/</span>
          <span>{locality.name}</span>
        </nav>

        <StatsBar stats={stats} cityName={city.name} localityName={locality.name} />

        {propertyTypes.length > 0 && (
          <PropertyTypeLinks
            citySlug={city.slug}
            localitySlug={locality.slug}
            types={propertyTypes}
          />
        )}

        <ListingsSection listings={listingCards} localityName={locality.name} cityName={city.name} />

        {stats.minPrice > 0 && (
          <BudgetBandLinks
            cityId={city.id}
            citySlug={city.slug}
            localityId={locality.id}
            localitySlug={locality.slug}
            minPrice={stats.minPrice}
            maxPrice={stats.maxPrice}
          />
        )}

        <GuidesSection guides={guides} cityName={city.name} />

        <WidgetsSection localityId={locality.id} />

        {nearbyLocalities.length > 0 && (
          <LocalityLinks citySlug={city.slug} localities={nearbyLocalities} />
        )}
      </div>
    </>
  );
}
