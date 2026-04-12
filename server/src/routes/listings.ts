import { Router } from 'express';
import { db } from '../db';
import { listings, contactLeads, users, cities, localities } from '../db/schema';
import { eq, and, desc, gte, lte, SQL, getTableColumns } from 'drizzle-orm';
import { requireAuth, AuthRequest, getAuthPayload } from '../middleware/auth';
import { contactRevealLimiter } from '../middleware/rateLimit';
import { calculateCompleteness, getTrustBadges } from '../services/completeness';
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
import { ListingInputError, parseIntParam, withDisplayLocation, canModifyListing } from '../lib/routeUtils';
import {
  listingInputSchema,
  createListingSchema,
  updateListingSchema,
  listingsQuerySchema,
} from '../lib/listingSchemas';
import { z } from 'zod';

const router = Router();

type ListingLocationInput = {
  cityId?: number;
  localityId?: number;
};

type ExistingListingLocation = {
  cityId: number | null;
  localityId: number | null;
};

const listingResponseColumns = {
  ...getTableColumns(listings),
  city: cities.name,
  locality: localities.name,
  citySlug: cities.slug,
  localitySlug: localities.slug,
  ownerVerified: users.isPosterVerified,
};

async function resolveListingLocation(
  input: ListingLocationInput,
  existing?: ExistingListingLocation
): Promise<{ city: string; locality: string; cityId: number | null; localityId: number | null }> {
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
    throw new ListingInputError('Selected city does not exist');
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
    throw new ListingInputError('Selected locality does not exist');
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
      throw new ListingInputError('Selected locality does not belong to the selected city');
    }
  }

  if (!resolvedCityId) throw new ListingInputError('cityId is required');
  if (!resolvedLocalityId) throw new ListingInputError('localityId is required');

  return {
    city: cityRow?.name ?? '',
    locality: localityRow?.name ?? '',
    cityId: resolvedCityId,
    localityId: resolvedLocalityId,
  };
}

async function getListingWithLocationById(id: number) {
  return db
    .select(listingResponseColumns)
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

// GET /api/listings — public list with filters
router.get('/', async (req, res) => {
  const parsed = listingsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message }); return;
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
  const cacheKey = getListingsListCacheKey(req.query);
  try {
    const cached = await cacheGet(cacheKey) as { data: unknown[]; page: number; limit: number } | null;
    if (cached) {
      res.json(cached);
      return;
    }

    const rows = await db
      .select(listingResponseColumns)
      .from(listings)
      .leftJoin(users, eq(listings.ownerId, users.id))
      .leftJoin(cities, eq(listings.cityId, cities.id))
      .leftJoin(localities, eq(listings.localityId, localities.id))
      .where(and(...conditions))
      .orderBy(desc(listings.completenessScore))
      .limit(limit)
      .offset(offset);
    const payload = {
      data: rows.map(enrichWithBadges),
      page,
      limit,
    };
    await cacheSet(cacheKey, payload, LISTINGS_LIST_CACHE_TTL);
    res.json(payload);
  } catch (err) {
    logger.error('listings list error', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET /api/listings/mine — owner/admin listing management view
router.get('/mine', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select(listingResponseColumns)
      .from(listings)
      .leftJoin(users, eq(listings.ownerId, users.id))
      .leftJoin(cities, eq(listings.cityId, cities.id))
      .leftJoin(localities, eq(listings.localityId, localities.id))
      .where(eq(listings.ownerId, req.user!.userId))
      .orderBy(desc(listings.updatedAt));
    res.json({ data: rows.map(enrichWithBadges) });
  } catch (err) {
    logger.error('my listings error', err);
    res.status(500).json({ error: 'Failed to fetch your listings' });
  }
});

// GET /api/listings/:id — public detail
router.get('/:id', async (req, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;
  try {
    const requester = await getAuthPayload(req);
    const canUseCache = requester === undefined;
    const cacheKey = getListingDetailCacheKey(id);

    if (canUseCache) {
      const cached = await cacheGet(cacheKey) as Record<string, unknown> | null;
      if (cached) {
        res.json(cached);
        return;
      }
    }

    const listing = await getListingWithLocationById(id);
    if (!listing) { res.status(404).json({ error: 'Listing not found' }); return; }
    const canViewNonPublic =
      requester !== undefined && (requester.isAdmin || requester.userId === listing.ownerId);
    if (listing.status !== 'active' && !canViewNonPublic) {
      res.status(404).json({ error: 'Listing not found' });
      return;
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
    res.json(payload);
  } catch (err) {
    logger.error('listing detail error', err);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// POST /api/listings — create (auth required); always saved as draft
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const result = createListingSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message }); return;
  }
  try {
    const data = result.data;
    const resolvedLocation = await resolveListingLocation(data);
    const completenessScore = calculateCompleteness({
      ...data,
      cityId: resolvedLocation.cityId,
      localityId: resolvedLocation.localityId,
    } as Parameters<typeof calculateCompleteness>[0]);

    const [listing] = await db.insert(listings).values({
      ownerId: req.user!.userId,
      title: data.title,
      cityId: resolvedLocation.cityId!,
      localityId: resolvedLocation.localityId!,
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
    const created = await getListingWithLocationById(listing.id);

    searchIndexQueue.add('index-listing', { listingId: listing.id, action: 'upsert' }).catch(
      (err) => logger.error('searchIndexQueue add error', err),
    );

    await invalidateListingCaches(listing.id);
    res.status(201).json(created ?? listing);
  } catch (err) {
    if (err instanceof ListingInputError) {
      res.status(400).json({ error: err.message });
      return;
    }
    logger.error('create listing error', err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// PUT /api/listings/:id — update (owner only)
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;
  try {
    const [existing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
    if (!canModifyListing(req, existing)) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    const result = updateListingSchema.safeParse(req.body);
    if (!result.success) { res.status(400).json({ error: result.error.issues[0].message }); return; }

    const resolvedLocation = await resolveListingLocation(result.data, {
      cityId: existing.cityId,
      localityId: existing.localityId,
    });
    const merged = {
      ...existing,
      ...result.data,
      cityId: resolvedLocation.cityId,
      localityId: resolvedLocation.localityId,
    };
    const mergedValidation = listingInputSchema.safeParse(merged);
    if (!mergedValidation.success) {
      res.status(400).json({ error: mergedValidation.error.issues[0].message });
      return;
    }
    const completenessScore = calculateCompleteness(merged as Parameters<typeof calculateCompleteness>[0]);
    const [updated] = await db
      .update(listings)
      .set({
        ...result.data,
        cityId: resolvedLocation.cityId!,
        localityId: resolvedLocation.localityId!,
        completenessScore,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, id))
      .returning();
    const hydrated = await getListingWithLocationById(updated.id);

    searchIndexQueue.add('index-listing', { listingId: updated.id, action: 'upsert' }).catch(
      (err) => logger.error('searchIndexQueue add error', err),
    );

    await invalidateListingCaches(updated.id);
    res.json(hydrated ?? updated);
  } catch (err) {
    if (err instanceof ListingInputError) {
      res.status(400).json({ error: err.message });
      return;
    }
    logger.error('update listing error', err);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// PATCH /api/listings/:id/status — change listing status (owner or admin)
router.patch('/:id/status', requireAuth, async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;

  const statusSchema = z.object({ status: z.enum(['draft', 'active', 'inactive']) });
  const result = statusSchema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ error: 'Invalid status value' }); return; }

  try {
    const [existing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
    if (!canModifyListing(req, existing)) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }

    if (result.data.status === 'active') {
      const [user] = await db
        .select({ isPosterVerified: users.isPosterVerified })
        .from(users)
        .where(eq(users.id, req.user!.userId))
        .limit(1);
      if (!user?.isPosterVerified) {
        res.status(403).json({ error: 'Complete poster verification before publishing.' });
        return;
      }
    }

    const [updated] = await db
      .update(listings)
      .set({ status: result.data.status, updatedAt: new Date() })
      .where(eq(listings.id, id))
      .returning();

    await invalidateListingCaches(id);
    res.json({ id: updated.id, status: updated.status });
  } catch (err) {
    logger.error('status update error', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /api/listings/:id (owner or admin)
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;
  try {
    const [existing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
    if (!canModifyListing(req, existing)) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    await db.delete(listings).where(eq(listings.id, id));
    searchIndexQueue.add('index-listing', { listingId: id, action: 'delete' }).catch(
      (err) => logger.error('searchIndexQueue add error', err),
    );
    await invalidateListingCaches(id);
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    logger.error('delete listing error', err);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

// POST /api/listings/:id/contact — reveal owner phone (auth required)
router.post('/:id/contact', requireAuth, contactRevealLimiter, async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;
  try {
    const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
    if (!listing) { res.status(404).json({ error: 'Not found' }); return; }
    const canViewNonPublic = req.user!.isAdmin || req.user!.userId === listing.ownerId;
    if (listing.status !== 'active' && !canViewNonPublic) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    if (listing.ownerId === req.user!.userId) {
      res.status(403).json({ error: 'You cannot contact yourself.' });
      return;
    }
    await db
      .insert(contactLeads)
      .values({ userId: req.user!.userId, listingId: id })
      .onConflictDoNothing()
      .catch(() => {});
    const [owner] = await db
      .select({ phone: users.phone, name: users.name })
      .from(users)
      .where(eq(users.id, listing.ownerId))
      .limit(1);
    if (!owner) { res.status(404).json({ error: 'Owner not found' }); return; }
    if (!owner.phone) { res.status(409).json({ error: 'Owner has not added a contact phone number yet' }); return; }
    res.json({ phone: owner.phone, name: owner.name });
  } catch (err) {
    logger.error('contact reveal error', err);
    res.status(500).json({ error: 'Failed to reveal contact' });
  }
});

export default router;
