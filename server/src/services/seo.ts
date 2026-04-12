import { db } from '../db';
import { cities, localities, listings, users } from '../db/schema';
import { eq, and, count, avg, min, max, desc, SQL } from 'drizzle-orm';
import { getTrustBadges } from './completeness';

export interface ListingCard {
  id: number;
  title: string;
  city: string;
  locality: string;
  citySlug: string;
  localitySlug: string;
  cityId: number;
  localityId: number;
  ownerId: number;
  intent: 'buy' | 'rent';
  price: number;
  deposit: number | null;
  areaSqft: number | null;
  availableFrom: Date | null;
  furnishing: string | null;
  preferredTenants: string;
  genderPref: string;
  landmark: string | null;
  propertyType: string;
  roomType: string;
  images: string[];
  foodIncluded: boolean;
  badges: string[];
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
  citySlug: cities.slug,
  localitySlug: localities.slug,
  cityId: listings.cityId,
  localityId: listings.localityId,
  ownerId: listings.ownerId,
  intent: listings.intent,
  price: listings.price,
  deposit: listings.deposit,
  areaSqft: listings.areaSqft,
  availableFrom: listings.availableFrom,
  furnishing: listings.furnishing,
  preferredTenants: listings.preferredTenants,
  genderPref: listings.genderPref,
  landmark: listings.landmark,
  propertyType: listings.propertyType,
  roomType: listings.roomType,
  images: listings.images,
  foodIncluded: listings.foodIncluded,
  ownerVerified: users.isPosterVerified,
  completenessScore: listings.completenessScore,
  updatedAt: listings.updatedAt,
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
    .innerJoin(users, eq(listings.ownerId, users.id))
    .innerJoin(cities, eq(listings.cityId, cities.id))
    .innerJoin(localities, eq(listings.localityId, localities.id))
    .where(and(...conditions))
    .orderBy(desc(listings.createdAt))
    .limit(limit);

  return rows.map(({ ownerVerified, completenessScore, updatedAt, ...rest }) => ({
    ...rest,
    badges: getTrustBadges({ ownerVerified, completenessScore, updatedAt }),
  }));
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
