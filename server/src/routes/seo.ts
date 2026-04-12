import { Router } from 'express';
import { db } from '../db';
import { cities, localities, listings } from '../db/schema';
import { eq, and, count, desc, sql, lte } from 'drizzle-orm';
import { cacheGet, cacheSet } from '../lib/redis';
import { logger } from '../lib/logger';
import {
  findActiveCityBySlug,
  findLocalityBySlug,
  queryListingCards,
  queryListingStats,
  buildMeta,
} from '../services/seo';

const router = Router();

const SEO_CACHE_TTL = 3600; // 1 hour

// GET /api/seo/top-params — returns top city/locality slug pairs by active listing count
router.get('/top-params', async (_req, res) => {
  try {
    const rows = await db
      .select({
        citySlug: cities.slug,
        localitySlug: localities.slug,
        listingCount: count(listings.id),
      })
      .from(listings)
      .innerJoin(cities, eq(listings.cityId, cities.id))
      .innerJoin(localities, eq(listings.localityId, localities.id))
      .where(and(eq(listings.status, 'active'), eq(listings.intent, 'rent')))
      .groupBy(cities.slug, localities.slug)
      .orderBy(desc(count(listings.id)))
      .limit(100);

    res.json(rows.map((r) => ({ city: r.citySlug, locality: r.localitySlug })));
  } catch (err) {
    logger.error('seo top-params error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/seo/city/:slug
router.get('/city/:slug', async (req, res) => {
  const { slug } = req.params;
  const cacheKey = `seo:city:${slug}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) { res.json(cached); return; }

    const city = await findActiveCityBySlug(slug);
    if (!city) { res.status(404).json({ error: 'City not found' }); return; }

    const activeRentInCity = [eq(listings.cityId, city.id), eq(listings.status, 'active'), eq(listings.intent, 'rent')];

    const [stats, topListings] = await Promise.all([
      queryListingStats(activeRentInCity),
      queryListingCards(activeRentInCity, 12),
    ]);

    const topLocalities = await db
      .select({
        id: localities.id,
        name: localities.name,
        slug: localities.slug,
        listingCount: count(listings.id),
      })
      .from(localities)
      .leftJoin(listings, and(eq(listings.localityId, localities.id), eq(listings.status, 'active'), eq(listings.intent, 'rent')))
      .where(eq(localities.cityId, city.id))
      .groupBy(localities.id, localities.name, localities.slug)
      .orderBy(desc(count(listings.id)))
      .limit(10);

    const propertyTypes = await db
      .select({ type: listings.propertyType, count: count(listings.id) })
      .from(listings)
      .where(and(...activeRentInCity))
      .groupBy(listings.propertyType)
      .orderBy(desc(count(listings.id)));

    const payload = {
      city,
      stats,
      listings: topListings,
      localities: topLocalities.map((l) => ({ ...l, listingCount: Number(l.listingCount) })),
      propertyTypes: propertyTypes.map((p) => ({ type: p.type, count: Number(p.count) })),
      meta: buildMeta(
        `PG & Rooms in ${city.name} | ZingBrokers`,
        `Find verified PG accommodations, hostels, apartments and flats in ${city.name}. Browse ${stats.totalListings} active listings.`,
      ),
    };

    await cacheSet(cacheKey, payload, SEO_CACHE_TTL);
    res.json(payload);
  } catch (err) {
    logger.error('seo city error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/seo/locality/:citySlug/:localitySlug
router.get('/locality/:citySlug/:localitySlug', async (req, res) => {
  const { citySlug, localitySlug } = req.params;
  const cacheKey = `seo:locality:${citySlug}:${localitySlug}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) { res.json(cached); return; }

    const city = await findActiveCityBySlug(citySlug);
    if (!city) { res.status(404).json({ error: 'City not found' }); return; }

    const locality = await findLocalityBySlug(city.id, localitySlug);
    if (!locality) { res.status(404).json({ error: 'Locality not found' }); return; }

    const activeRentInLocality = [eq(listings.localityId, locality.id), eq(listings.status, 'active'), eq(listings.intent, 'rent')];

    const [stats, topListings] = await Promise.all([
      queryListingStats(activeRentInLocality),
      queryListingCards(activeRentInLocality, 12),
    ]);

    const propertyTypes = await db
      .select({ type: listings.propertyType, count: count(listings.id) })
      .from(listings)
      .where(and(...activeRentInLocality))
      .groupBy(listings.propertyType)
      .orderBy(desc(count(listings.id)));

    const nearbyLocalities = await db
      .select({
        id: localities.id,
        name: localities.name,
        slug: localities.slug,
        listingCount: count(listings.id),
      })
      .from(localities)
      .leftJoin(listings, and(eq(listings.localityId, localities.id), eq(listings.status, 'active'), eq(listings.intent, 'rent')))
      .where(and(eq(localities.cityId, city.id), sql`${localities.id} != ${locality.id}`))
      .groupBy(localities.id, localities.name, localities.slug)
      .orderBy(desc(count(listings.id)))
      .limit(5);

    const payload = {
      city,
      locality,
      stats,
      listings: topListings,
      propertyTypes: propertyTypes.map((p) => ({ type: p.type, count: Number(p.count) })),
      nearbyLocalities: nearbyLocalities.map((l) => ({ ...l, listingCount: Number(l.listingCount) })),
      meta: buildMeta(
        `PG & Rooms in ${locality.name}, ${city.name} | ZingBrokers`,
        `Find verified PG accommodations, hostels, apartments in ${locality.name}, ${city.name}. ${stats.totalListings} active listings available.`,
      ),
    };

    await cacheSet(cacheKey, payload, SEO_CACHE_TTL);
    res.json(payload);
  } catch (err) {
    logger.error('seo locality error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/seo/locality/:citySlug/:localitySlug/:type
router.get('/locality/:citySlug/:localitySlug/:type', async (req, res) => {
  const { citySlug, localitySlug, type } = req.params;
  const cacheKey = `seo:type:${citySlug}:${localitySlug}:${type}`;

  const validTypes = ['pg', 'hostel', 'apartment', 'flat'];
  if (!validTypes.includes(type)) {
    res.status(404).json({ error: 'Invalid property type' });
    return;
  }

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) { res.json(cached); return; }

    const city = await findActiveCityBySlug(citySlug);
    if (!city) { res.status(404).json({ error: 'City not found' }); return; }

    const locality = await findLocalityBySlug(city.id, localitySlug);
    if (!locality) { res.status(404).json({ error: 'Locality not found' }); return; }

    const propertyType = type as 'pg' | 'hostel' | 'apartment' | 'flat';
    const conditions = [
      eq(listings.localityId, locality.id),
      eq(listings.status, 'active'),
      eq(listings.intent, 'rent'),
      eq(listings.propertyType, propertyType),
    ];

    const [priceRange, filteredListings] = await Promise.all([
      queryListingStats(conditions),
      queryListingCards(conditions, 12),
    ]);

    const otherTypes = await db
      .select({ type: listings.propertyType })
      .from(listings)
      .where(and(eq(listings.localityId, locality.id), eq(listings.status, 'active'), eq(listings.intent, 'rent')))
      .groupBy(listings.propertyType);

    const relatedTypes = otherTypes.map((r) => r.type as string).filter((t) => t !== type);
    const typeLabel = type.toUpperCase();

    const payload = {
      city,
      locality,
      propertyType: type,
      priceRange: {
        min: priceRange.minPrice,
        max: priceRange.maxPrice,
        avg: priceRange.avgPrice,
      },
      listings: filteredListings,
      relatedTypes,
      meta: buildMeta(
        `${typeLabel} in ${locality.name}, ${city.name} | ZingBrokers`,
        `Find verified ${typeLabel} accommodations in ${locality.name}, ${city.name}. ${filteredListings.length} active listings.`,
      ),
    };

    await cacheSet(cacheKey, payload, SEO_CACHE_TTL);
    res.json(payload);
  } catch (err) {
    logger.error('seo type error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const VALID_BANDS = ['under-5000', 'under-8000', 'under-10000', 'under-15000', 'under-20000'] as const;
type BudgetBand = (typeof VALID_BANDS)[number];

// GET /api/seo/locality/:citySlug/:localitySlug/budget/:band
router.get('/locality/:citySlug/:localitySlug/budget/:band', async (req, res) => {
  const { citySlug, localitySlug, band } = req.params;

  if (!VALID_BANDS.includes(band as BudgetBand)) {
    res.status(404).json({ error: 'Invalid budget band' });
    return;
  }

  const maxPrice = parseInt(band.replace('under-', ''), 10);
  const cacheKey = `seo:budget:${citySlug}:${localitySlug}:${band}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) { res.json(cached); return; }

    const city = await findActiveCityBySlug(citySlug);
    if (!city) { res.status(404).json({ error: 'City not found' }); return; }

    const locality = await findLocalityBySlug(city.id, localitySlug);
    if (!locality) { res.status(404).json({ error: 'Locality not found' }); return; }

    const conditions = [
      eq(listings.localityId, locality.id),
      eq(listings.status, 'active'),
      eq(listings.intent, 'rent'),
      lte(listings.price, maxPrice),
    ];

    const [stats, filteredListings] = await Promise.all([
      queryListingStats(conditions),
      queryListingCards(conditions, 12),
    ]);

    const otherBands = VALID_BANDS.filter((b) => b !== band);

    const payload = {
      city,
      locality,
      band,
      maxPrice,
      stats,
      listings: filteredListings,
      otherBands,
      meta: buildMeta(
        `Rooms under ₹${maxPrice.toLocaleString('en-IN')} in ${locality.name}, ${city.name} | ZingBrokers`,
        `Find affordable rooms and PG under ₹${maxPrice.toLocaleString('en-IN')}/mo in ${locality.name}, ${city.name}. ${stats.totalListings} listings available.`,
      ),
    };

    await cacheSet(cacheKey, payload, SEO_CACHE_TTL);
    res.json(payload);
  } catch (err) {
    logger.error('seo budget band error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
