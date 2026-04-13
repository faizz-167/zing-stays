import { db } from '../db';
import { listings, contactLeads, users, cities, localities } from '../db/schema';
import { eq, and, desc, gte, lte, SQL, getTableColumns } from 'drizzle-orm';
import { calculateCompleteness, getTrustBadges } from './completeness';
import { searchIndexQueue } from '../lib/queues';
import { cacheGet, cacheSet } from '../lib/redis';
import {
  getListingsListCacheKey,
  getListingDetailCacheKey,
  invalidateListingCaches,
  LISTINGS_LIST_CACHE_TTL,
  LISTING_DETAIL_CACHE_TTL,
} from '../lib/listingCache';
import { logger } from '../lib/logger';
import { withDisplayLocation, canModifyListing } from '../lib/routeUtils';
import {
  listingInputSchema,
  createListingSchema,
  updateListingSchema,
  listingsQuerySchema,
} from '../lib/listingSchemas';
import { ValidationError, NotFoundError, ForbiddenError } from '../lib/errors';
import type { AuthRequest } from '../middleware/auth';
import type { Request } from 'express';
import { z } from 'zod';

// ── Column Map ──────────────────────────────────────────────────────
const RESPONSE_COLUMNS = {
  ...getTableColumns(listings),
  city: cities.name,
  locality: localities.name,
  citySlug: cities.slug,
  localitySlug: localities.slug,
  ownerVerified: users.isPosterVerified,
};

// ── Types ───────────────────────────────────────────────────────────
type ListingLocationInput = { cityId?: number; localityId?: number };
type ExistingLocation = { cityId: number | null; localityId: number | null };
type ResolvedLocation = { city: string; locality: string; cityId: number | null; localityId: number | null };

// ── Location Resolution ─────────────────────────────────────────────
async function resolveLocation(
  input: ListingLocationInput,
  existing?: ExistingLocation,
): Promise<ResolvedLocation> {
  let resolvedCityId = input.cityId ?? existing?.cityId ?? null;
  let resolvedLocalityId = input.localityId ?? existing?.localityId ?? null;

  let cityRow = resolvedCityId
    ? await db
        .select({ id: cities.id, name: cities.name })
        .from(cities)
        .where(eq(cities.id, resolvedCityId))
        .limit(1)
        .then(rows => rows[0])
    : undefined;
  if (resolvedCityId && !cityRow) {
    throw new ValidationError('Selected city does not exist');
  }

  const localityRow = resolvedLocalityId
    ? await db
        .select({ id: localities.id, name: localities.name, cityId: localities.cityId })
        .from(localities)
        .where(eq(localities.id, resolvedLocalityId))
        .limit(1)
        .then(rows => rows[0])
    : undefined;
  if (resolvedLocalityId && !localityRow) {
    throw new ValidationError('Selected locality does not exist');
  }

  if (localityRow) {
    if (!resolvedCityId) {
      resolvedCityId = localityRow.cityId;
      cityRow = await db
        .select({ id: cities.id, name: cities.name })
        .from(cities)
        .where(eq(cities.id, resolvedCityId))
        .limit(1)
        .then(rows => rows[0]);
    } else if (localityRow.cityId !== resolvedCityId) {
      throw new ValidationError('Selected locality does not belong to the selected city');
    }
  }

  if (!resolvedCityId) throw new ValidationError('cityId is required');
  if (!resolvedLocalityId) throw new ValidationError('localityId is required');

  return {
    city: cityRow?.name ?? '',
    locality: localityRow?.name ?? '',
    cityId: resolvedCityId,
    localityId: resolvedLocalityId,
  };
}

// ── Query Helpers ───────────────────────────────────────────────────
function getByIdQuery(id: number) {
  return db
    .select(RESPONSE_COLUMNS)
    .from(listings)
    .leftJoin(users, eq(listings.ownerId, users.id))
    .leftJoin(cities, eq(listings.cityId, cities.id))
    .leftJoin(localities, eq(listings.localityId, localities.id))
    .where(eq(listings.id, id))
    .limit(1)
    .then(rows => rows[0]);
}

function enrichWithBadges<
  T extends {
    city: string | null;
    locality: string | null;
    ownerVerified?: boolean | null;
    completenessScore: number;
    updatedAt: Date;
  },
>(listing: T) {
  return {
    ...withDisplayLocation(listing),
    badges: getTrustBadges(listing),
  };
}

function enqueueSearchIndex(listingId: number, action: 'upsert' | 'delete') {
  searchIndexQueue.add('index-listing', { listingId, action }).catch(
    (err) => logger.error('searchIndexQueue add error', err),
  );
}

// ── Public API ──────────────────────────────────────────────────────

export async function listListings(query: Request['query']) {
  const parsed = listingsQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  const { cityId, localityId, intent, room_type, property_type, food_included, gender, price_min, price_max, page, limit } = parsed.data;
  const conditions: SQL[] = [eq(listings.status, 'active')];
  if (cityId) conditions.push(eq(listings.cityId, cityId));
  if (localityId) conditions.push(eq(listings.localityId, localityId));
  if (intent) conditions.push(eq(listings.intent, intent));
  if (room_type) conditions.push(eq(listings.roomType, room_type));
  if (property_type) conditions.push(eq(listings.propertyType, property_type));
  if (food_included === 'true') conditions.push(eq(listings.foodIncluded, true));
  if (gender) conditions.push(eq(listings.genderPref, gender));
  if (price_min !== undefined) conditions.push(gte(listings.price, price_min));
  if (price_max !== undefined) conditions.push(lte(listings.price, price_max));

  const offset = (page - 1) * limit;
  const cacheKey = getListingsListCacheKey(query);
  const cached = await cacheGet(cacheKey) as { data: unknown[]; page: number; limit: number } | null;
  if (cached) return cached;

  const rows = await db
    .select(RESPONSE_COLUMNS)
    .from(listings)
    .leftJoin(users, eq(listings.ownerId, users.id))
    .leftJoin(cities, eq(listings.cityId, cities.id))
    .leftJoin(localities, eq(listings.localityId, localities.id))
    .where(and(...conditions))
    .orderBy(desc(listings.completenessScore))
    .limit(limit)
    .offset(offset);

  const payload = { data: rows.map(enrichWithBadges), page, limit };
  await cacheSet(cacheKey, payload, LISTINGS_LIST_CACHE_TTL);
  return payload;
}

export async function getMyListings(userId: number) {
  const rows = await db
    .select(RESPONSE_COLUMNS)
    .from(listings)
    .leftJoin(users, eq(listings.ownerId, users.id))
    .leftJoin(cities, eq(listings.cityId, cities.id))
    .leftJoin(localities, eq(listings.localityId, localities.id))
    .where(eq(listings.ownerId, userId))
    .orderBy(desc(listings.updatedAt));
  return { data: rows.map(enrichWithBadges) };
}

export async function getListingDetail(
  id: number,
  requester?: { userId: number; isAdmin: boolean },
) {
  const canUseCache = requester === undefined;
  const cacheKey = getListingDetailCacheKey(id);

  if (canUseCache) {
    const cached = await cacheGet(cacheKey) as Record<string, unknown> | null;
    if (cached) return cached;
  }

  const listing = await getByIdQuery(id);
  if (!listing) throw new NotFoundError('Listing not found');

  const canViewNonPublic = requester !== undefined && (requester.isAdmin || requester.userId === listing.ownerId);
  if (listing.status !== 'active' && !canViewNonPublic) {
    throw new NotFoundError('Listing not found');
  }

  const [owner] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, listing.ownerId))
    .limit(1);

  let hasContacted = false;
  if (requester !== undefined) {
    const [lead] = await db
      .select({ id: contactLeads.id })
      .from(contactLeads)
      .where(and(eq(contactLeads.userId, requester.userId), eq(contactLeads.listingId, id)))
      .limit(1);
    hasContacted = lead !== undefined;
  }

  const normalizedListing = withDisplayLocation(listing);
  const payload = {
    ...normalizedListing,
    ownerName: owner?.name,
    badges: getTrustBadges(normalizedListing),
    hasContacted,
  };

  if (canUseCache) {
    await cacheSet(cacheKey, payload, LISTING_DETAIL_CACHE_TTL);
  }
  return payload;
}

export async function createListing(body: unknown, ownerId: number) {
  const result = createListingSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message);
  }

  const data = result.data;
  const location = await resolveLocation(data);
  const completenessScore = calculateCompleteness({
    ...data,
    cityId: location.cityId,
    localityId: location.localityId,
  } as Parameters<typeof calculateCompleteness>[0]);

  const [listing] = await db.insert(listings).values({
    ownerId,
    title: data.title,
    cityId: location.cityId!,
    localityId: location.localityId!,
    intent: data.intent,
    price: data.price,
    roomType: data.roomType,
    propertyType: data.propertyType,
    deposit: data.deposit,
    areaSqft: data.areaSqft,
    availableFrom: data.availableFrom,
    furnishing: data.furnishing,
    preferredTenants: data.preferredTenants,
    description: data.description,
    landmark: data.landmark,
    address: data.address,
    foodIncluded: data.foodIncluded,
    genderPref: data.genderPref,
    amenities: data.amenities,
    rules: data.rules,
    images: data.images,
    completenessScore,
    status: 'draft',
  }).returning();

  const created = await getByIdQuery(listing.id);
  enqueueSearchIndex(listing.id, 'upsert');
  await invalidateListingCaches(listing.id);
  return created ?? listing;
}

export async function updateListing(id: number, body: unknown, req: AuthRequest) {
  const [existing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!existing) throw new NotFoundError('Not found');
  if (!canModifyListing(req, existing)) throw new ForbiddenError();

  const result = updateListingSchema.safeParse(body);
  if (!result.success) throw new ValidationError(result.error.issues[0].message);

  const location = await resolveLocation(result.data, {
    cityId: existing.cityId,
    localityId: existing.localityId,
  });

  const merged = {
    ...existing,
    ...result.data,
    cityId: location.cityId,
    localityId: location.localityId,
  };
  const mergedValidation = listingInputSchema.safeParse(merged);
  if (!mergedValidation.success) {
    throw new ValidationError(mergedValidation.error.issues[0].message);
  }

  const completenessScore = calculateCompleteness(merged as Parameters<typeof calculateCompleteness>[0]);
  const [updated] = await db
    .update(listings)
    .set({
      ...result.data,
      cityId: location.cityId!,
      localityId: location.localityId!,
      completenessScore,
      updatedAt: new Date(),
    })
    .where(eq(listings.id, id))
    .returning();

  const hydrated = await getByIdQuery(updated.id);
  enqueueSearchIndex(updated.id, 'upsert');
  await invalidateListingCaches(updated.id);
  return hydrated ?? updated;
}

export async function updateListingStatus(id: number, body: unknown, req: AuthRequest) {
  const statusSchema = z.object({ status: z.enum(['draft', 'active', 'inactive']) });
  const result = statusSchema.safeParse(body);
  if (!result.success) throw new ValidationError('Invalid status value');

  const [existing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!existing) throw new NotFoundError('Not found');
  if (!canModifyListing(req, existing)) throw new ForbiddenError();

  if (result.data.status === 'active') {
    const [user] = await db
      .select({ isPosterVerified: users.isPosterVerified })
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);
    if (!user?.isPosterVerified) {
      throw new ForbiddenError('Complete poster verification before publishing.');
    }
  }

  const [updated] = await db
    .update(listings)
    .set({ status: result.data.status, updatedAt: new Date() })
    .where(eq(listings.id, id))
    .returning();

  enqueueSearchIndex(id, result.data.status === 'active' ? 'upsert' : 'delete');
  await invalidateListingCaches(id);
  return { id: updated.id, status: updated.status };
}

export async function deleteListing(id: number, req: AuthRequest) {
  const [existing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!existing) throw new NotFoundError('Not found');
  if (!canModifyListing(req, existing)) throw new ForbiddenError();

  await db.delete(listings).where(eq(listings.id, id));
  enqueueSearchIndex(id, 'delete');
  await invalidateListingCaches(id);
  return { message: 'Listing deleted' };
}

export async function revealContact(id: number, userId: number, isAdmin: boolean) {
  const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!listing) throw new NotFoundError('Not found');

  const canViewNonPublic = isAdmin || userId === listing.ownerId;
  if (listing.status !== 'active' && !canViewNonPublic) {
    throw new NotFoundError('Not found');
  }
  if (listing.ownerId === userId) {
    throw new ForbiddenError('You cannot contact yourself.');
  }

  await db
    .insert(contactLeads)
    .values({ userId, listingId: id })
    .onConflictDoNothing()
    .catch(() => {});

  const [owner] = await db
    .select({ phone: users.phone, name: users.name })
    .from(users)
    .where(eq(users.id, listing.ownerId))
    .limit(1);
  if (!owner) throw new NotFoundError('Owner not found');
  if (!owner.phone) {
    throw new ValidationError('Owner has not added a contact phone number yet');
  }

  return { phone: owner.phone, name: owner.name };
}
