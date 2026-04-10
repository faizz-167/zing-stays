import { db } from '../db';
import { cities, localities, listings } from '../db/schema';
import { eq, and, count, avg, min, max, desc, SQL } from 'drizzle-orm';

export interface ListingCard {
  id: number;
  title: string;
  city: string;
  locality: string;
  intent: 'buy' | 'rent';
  price: number;
  propertyType: string;
  roomType: string;
  images: string[];
  foodIncluded: boolean;
}

/**
 * Shared select columns for listing card queries across all SEO routes.
 * Requires `.innerJoin(cities)` and `.innerJoin(localities)` on the query.
 */
export const LISTING_CARD_COLUMNS = {
  id: listings.id,
  title: listings.title,
  city: cities.name,
  locality: localities.name,
  intent: listings.intent,
  price: listings.price,
  propertyType: listings.propertyType,
  roomType: listings.roomType,
  images: listings.images,
  foodIncluded: listings.foodIncluded,
} as const;

export async function findActiveCityBySlug(slug: string) {
  const [city] = await db
    .select({ id: cities.id, name: cities.name, slug: cities.slug, state: cities.state })
    .from(cities)
    .where(and(eq(cities.slug, slug), eq(cities.isActive, true)))
    .limit(1);
  return city ?? null;
}

export async function findLocalityBySlug(cityId: number, slug: string) {
  const [locality] = await db
    .select({ id: localities.id, name: localities.name, slug: localities.slug })
    .from(localities)
    .where(and(eq(localities.cityId, cityId), eq(localities.slug, slug)))
    .limit(1);
  return locality ?? null;
}

export async function queryListingCards(conditions: SQL[], limit = 12): Promise<ListingCard[]> {
  const rows = await db
    .select(LISTING_CARD_COLUMNS)
    .from(listings)
    .innerJoin(cities, eq(listings.cityId, cities.id))
    .innerJoin(localities, eq(listings.localityId, localities.id))
    .where(and(...conditions))
    .orderBy(desc(listings.createdAt))
    .limit(limit);
  return rows as ListingCard[];
}

export async function queryListingStats(conditions: SQL[]) {
  const [stats] = await db
    .select({
      totalListings: count(listings.id),
      avgPrice: avg(listings.price),
      minPrice: min(listings.price),
      maxPrice: max(listings.price),
    })
    .from(listings)
    .where(and(...conditions));
  return normalizeStats(stats);
}

export function normalizeStats(stats: {
  totalListings: number;
  avgPrice: string | null;
  minPrice: number | null;
  maxPrice: number | null;
} | undefined) {
  return {
    totalListings: Number(stats?.totalListings ?? 0),
    avgPrice: Math.round(Number(stats?.avgPrice ?? 0)),
    minPrice: Number(stats?.minPrice ?? 0),
    maxPrice: Number(stats?.maxPrice ?? 0),
  };
}

export function buildMeta(title: string, description: string) {
  return { title, description };
}
