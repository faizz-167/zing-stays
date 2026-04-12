import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PropertyTypeLinks from '@/components/seo/PropertyTypeLinks';
import BudgetBandLinks from '@/components/seo/BudgetBandLinks';
import SeoListingCard from '@/components/seo/SeoListingCard';
import SeoPageTracker from '@/components/seo/SeoPageTracker';
import ListingsTopBar from '@/components/search/ListingsTopBar';
import type { ListingCardData } from '@/lib/types';

export const revalidate = 3600;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface TypePageData {
  city: { id: number; name: string; slug: string };
  locality: { id: number; name: string; slug: string };
  propertyType: string;
  priceRange: { min: number; max: number; avg: number };
  listings: (ListingCardData & { foodIncluded: boolean })[];
  relatedTypes: string[];
  meta: { title: string; description: string };
}

async function getTypeData(
  citySlug: string,
  localitySlug: string,
  type: string,
): Promise<TypePageData | null> {
  const res = await fetch(`${API_URL}/seo/locality/${citySlug}/${localitySlug}/${type}`, {
    next: { revalidate: 3600 },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json() as Promise<TypePageData>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; locality: string; type: string }>;
}): Promise<Metadata> {
  const { city: citySlug, locality: localitySlug, type } = await params;
  const data = await getTypeData(citySlug, localitySlug, type);

  if (!data) {
    return { title: 'Not Found | ZingBrokers' };
  }

  return {
    title: data.meta.title,
    description: data.meta.description,
    alternates: {
      canonical: `https://zingbrokers.com/${citySlug}/${localitySlug}/${type}`,
    },
    robots: { index: true, follow: true },
  };
}

const TYPE_LABELS: Record<string, string> = {
  pg: 'PG',
  hostel: 'Hostel',
  apartment: 'Apartment',
  flat: 'Flat',
};

export default async function TypePage({
  params,
}: {
  params: Promise<{ city: string; locality: string; type: string }>;
}) {
  const { city: citySlug, locality: localitySlug, type } = await params;
  const data = await getTypeData(citySlug, localitySlug, type);
  if (!data) notFound();

  const { city, locality, priceRange, listings, relatedTypes } = data;
  const typeLabel = TYPE_LABELS[type] ?? type.toUpperCase();

  const listingCards: ListingCardData[] = listings.map((l) => ({
    ...l,
    badges: [],
  }));

  const relatedTypesForLinks = [
    ...relatedTypes.map((t) => ({ type: t, count: 0 })),
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: data.meta.title,
    numberOfItems: listings.length,
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
        propertyType={type}
        pageType="seo_locality_type"
      />
      <div className="max-w-content mx-auto px-6 py-12 space-y-12">
        <ListingsTopBar
          initialCity={{ id: city.id, name: city.name, slug: city.slug }}
          initialLocalities={[{ id: locality.id, name: locality.name, slug: locality.slug, cityId: city.id }]}
        />
        {/* Breadcrumb */}
        <nav className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <a href={`/${city.slug}`} className="hover:text-foreground transition-colors">
            {city.name}
          </a>
          <span>/</span>
          <a
            href={`/${city.slug}/${locality.slug}`}
            className="hover:text-foreground transition-colors"
          >
            {locality.name}
          </a>
          <span>/</span>
          <span>{typeLabel}</span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="font-display text-4xl leading-tight mb-4">
            {typeLabel} in {locality.name}, {city.name}
          </h1>
          {priceRange.min > 0 && (
            <div className="flex flex-wrap gap-6 font-sans text-sm text-muted-foreground">
              <span>{listings.length} listings</span>
              {priceRange.avg > 0 && (
                <span>Avg ₹{priceRange.avg.toLocaleString('en-IN')}/mo</span>
              )}
              <span>
                ₹{priceRange.min.toLocaleString('en-IN')} – ₹
                {priceRange.max.toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>

        {/* Related types */}
        {relatedTypesForLinks.length > 0 && (
          <PropertyTypeLinks
            citySlug={city.slug}
            localitySlug={locality.slug}
            types={relatedTypesForLinks}
            activeType={type}
          />
        )}

        {/* Listings grid */}
        {listingCards.length > 0 ? (
          <div>
            <h2 className="font-display text-2xl mb-6">
              {typeLabel} Listings in {locality.name}
            </h2>
            <div className="space-y-6">
              {listingCards.map((l) => (
                <SeoListingCard
                  key={l.id}
                  listing={l}
                  city={city.name}
                  locality={locality.name}
                  pageType="seo_locality_type"
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="font-sans text-muted-foreground">
            No active {typeLabel} listings in {locality.name} yet.
          </p>
        )}

        {/* Budget bands */}
        {priceRange.min > 0 && (
          <BudgetBandLinks
            cityId={city.id}
            citySlug={city.slug}
            localityId={locality.id}
            localitySlug={locality.slug}
            minPrice={priceRange.min}
            maxPrice={priceRange.max}
          />
        )}
      </div>
    </>
  );
}
