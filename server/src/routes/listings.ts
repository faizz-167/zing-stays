import { Router, type Request } from 'express';
import { db } from '../db';
import { listings, contactLeads, users, cities, localities } from '../db/schema';
import { eq, and, desc, gte, lte, SQL, getTableColumns } from 'drizzle-orm';
import { requireAuth, AuthRequest, getAuthPayload } from '../middleware/auth';
import { contactRevealLimiter } from '../middleware/rateLimit';
import { calculateCompleteness, getTrustBadges } from '../services/completeness';
import { searchIndexQueue } from '../lib/queues';
import { cacheGet, cacheSet, cacheInvalidate, cacheInvalidateByPrefix } from '../lib/redis';
import { z } from 'zod';

const router = Router();

const listingInputSchema = z.object({
  title: z.string().min(5).max(200),
  cityId: z.number().int().positive().optional(),
  localityId: z.number().int().positive().optional(),
  intent: z.enum(['buy', 'rent']).optional().default('rent'),
  price: z.number().int().min(500).max(500000),
  roomType: z.enum(['single', 'double', 'multiple', '1bhk', '2bhk', '3bhk', '4bhk']),
  propertyType: z.enum(['pg', 'hostel', 'apartment', 'flat']),
  description: z.string().max(2000).optional(),
  landmark: z.string().max(200).optional(),
  address: z.string().optional(),
  foodIncluded: z.boolean().optional().default(false),
  genderPref: z.enum(['male', 'female', 'any']).optional().default('any'),
  amenities: z.array(z.string()).optional().default([]),
  rules: z.string().optional(),
  images: z.array(z.string().url()).optional().default([]),
});

const createListingSchema = listingInputSchema.superRefine((value, ctx) => {
  if (!value.cityId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cityId'],
      message: 'cityId is required',
    });
  }
  if (!value.localityId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['localityId'],
      message: 'localityId is required',
    });
  }
});

const updateListingSchema = listingInputSchema.partial();

const listingsQuerySchema = z.object({
  cityId: z.coerce.number().int().positive().optional(),
  localityId: z.coerce.number().int().positive().optional(),
  intent: z.enum(['buy', 'rent']).optional(),
  room_type: z.enum(['single', 'double', 'multiple', '1bhk', '2bhk', '3bhk', '4bhk']).optional(),
  property_type: z.enum(['pg', 'hostel', 'apartment', 'flat']).optional(),
  food_included: z.enum(['true', 'false']).optional(),
  gender: z.enum(['male', 'female', 'any']).optional(),
  price_min: z.coerce.number().int().positive().optional(),
  price_max: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

type ListingLocationInput = {
  cityId?: number;
  localityId?: number;
};

type ExistingListingLocation = {
  cityId: number | null;
  localityId: number | null;
};

const LISTINGS_LIST_CACHE_PREFIX = 'cache:listings:list:';
const LISTING_DETAIL_CACHE_PREFIX = 'cache:listings:detail:';

function getListingsListCacheKey(query: Request['query']): string {
  const params = new URLSearchParams();
  Object.entries(query)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => {
      if (value === undefined) return;
      if (Array.isArray(value)) {
        value
          .filter((item): item is string => typeof item === 'string')
          .forEach((item) => params.append(key, item));
        return;
      }
      if (typeof value === 'string') {
        params.set(key, value);
      }
    });

  return `${LISTINGS_LIST_CACHE_PREFIX}${params.toString()}`;
}

function getListingDetailCacheKey(id: number): string {
  return `${LISTING_DETAIL_CACHE_PREFIX}${id}`;
}

const listingResponseColumns = {
  ...getTableColumns(listings),
  city: cities.name,
  locality: localities.name,
};

async function invalidateListingCaches(listingId?: number): Promise<void> {
  const invalidations: Promise<unknown>[] = [cacheInvalidateByPrefix(LISTINGS_LIST_CACHE_PREFIX)];
  if (listingId !== undefined) {
    invalidations.push(cacheInvalidate(getListingDetailCacheKey(listingId)));
  }
  await Promise.all(invalidations);
}

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
    throw new Error('Selected city does not exist');
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
    throw new Error('Selected locality does not exist');
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
      throw new Error('Selected locality does not belong to the selected city');
    }
  }

  if (!resolvedCityId) {
    throw new Error('cityId is required');
  }
  if (!resolvedLocalityId) {
    throw new Error('localityId is required');
  }

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
    .leftJoin(cities, eq(listings.cityId, cities.id))
    .leftJoin(localities, eq(listings.localityId, localities.id))
    .where(eq(listings.id, id))
    .limit(1)
    .then(rows => rows[0]);
}

function withDisplayLocation<T extends { city: string | null; locality: string | null }>(listing: T) {
  return {
    ...listing,
    city: listing.city ?? '',
    locality: listing.locality ?? '',
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
      .leftJoin(cities, eq(listings.cityId, cities.id))
      .leftJoin(localities, eq(listings.localityId, localities.id))
      .where(and(...conditions))
      .orderBy(desc(listings.completenessScore))
      .limit(limit)
      .offset(offset);
    const payload = {
      data: rows.map((listing) => {
        const normalized = withDisplayLocation(listing);
        return {
          ...normalized,
          badges: getTrustBadges(normalized),
        };
      }),
      page,
      limit,
    };
    await cacheSet(cacheKey, payload, 60);
    res.json(payload);
  } catch (err) {
    console.error('listings list error:', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET /api/listings/mine — owner/admin listing management view
router.get('/mine', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select(listingResponseColumns)
      .from(listings)
      .leftJoin(cities, eq(listings.cityId, cities.id))
      .leftJoin(localities, eq(listings.localityId, localities.id))
      .where(eq(listings.ownerId, req.user!.userId))
      .orderBy(desc(listings.updatedAt));
    const withBadges = rows.map((listing) => {
      const normalized = withDisplayLocation(listing);
      return {
        ...normalized,
        badges: getTrustBadges(normalized),
      };
    });
    res.json({ data: withBadges });
  } catch (err) {
    console.error('my listings error:', err);
    res.status(500).json({ error: 'Failed to fetch your listings' });
  }
});

// GET /api/listings/:id — public detail
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const requester = getAuthPayload(req);
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
      await cacheSet(cacheKey, payload, 300);
    }
    res.json(payload);
  } catch (err) {
    console.error('listing detail error:', err);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// POST /api/listings — create (auth required)
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
      description: data.description,
      landmark: data.landmark,
      address: data.address,
      foodIncluded: data.foodIncluded,
      genderPref: data.genderPref,
      amenities: data.amenities,
      rules: data.rules,
      images: data.images,
      completenessScore,
    }).returning();
    const created = await getListingWithLocationById(listing.id);

    searchIndexQueue.add('index-listing', { listingId: listing.id, action: 'upsert' }).catch(
      (err) => console.error('searchIndexQueue add error:', err),
    );

    await invalidateListingCaches(listing.id);
    res.status(201).json(created ?? listing);
  } catch (err) {
    console.error('create listing error:', err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// PUT /api/listings/:id — update (owner only)
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const [existing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
    if (existing.ownerId !== req.user!.userId && !req.user!.isAdmin) {
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
      (err) => console.error('searchIndexQueue add error:', err),
    );

    await invalidateListingCaches(updated.id);
    res.json(hydrated ?? updated);
  } catch (err) {
    console.error('update listing error:', err);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// DELETE /api/listings/:id (owner or admin)
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
  try {
    const [existing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
    if (existing.ownerId !== req.user!.userId && !req.user!.isAdmin) {
      res.status(403).json({ error: 'Forbidden' }); return;
    }
    await db.delete(listings).where(eq(listings.id, id));
    searchIndexQueue.add('index-listing', { listingId: id, action: 'delete' }).catch(
      (err) => console.error('searchIndexQueue add error:', err),
    );
    await invalidateListingCaches(id);
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    console.error('delete listing error:', err);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

// POST /api/listings/:id/contact — reveal owner phone (auth required)
router.post('/:id/contact', requireAuth, contactRevealLimiter, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid ID' }); return; }
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
    console.error('contact reveal error:', err);
    res.status(500).json({ error: 'Failed to reveal contact' });
  }
});

export default router;
