import { Router } from 'express';
import { db } from '../db';
import { cities, localities, localityNeighbors } from '../db/schema';
import { and, eq, ne, asc } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '../lib/logger';

const router = Router();

// GET /api/cities — all active cities
router.get('/cities', async (_req, res) => {
  try {
    const rows = await db
      .select({ id: cities.id, name: cities.name, slug: cities.slug, state: cities.state })
      .from(cities)
      .where(eq(cities.isActive, true))
      .orderBy(asc(cities.name));
    res.json({ data: rows });
  } catch (err) {
    logger.error('cities fetch error', err);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

const localitiesQuerySchema = z.object({
  cityId: z.coerce.number().int().positive(),
});

// GET /api/localities?cityId=N — localities for a city
router.get(['/localities', '/cities/localities'], async (req, res) => {
  const parsed = localitiesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'cityId query param required' });
    return;
  }
  try {
    const rows = await db
      .select({ id: localities.id, name: localities.name, slug: localities.slug, cityId: localities.cityId })
      .from(localities)
      .where(and(eq(localities.cityId, parsed.data.cityId), eq(localities.isActive, true)))
      .orderBy(asc(localities.name));
    res.json({ data: rows });
  } catch (err) {
    logger.error('localities fetch error', err);
    res.status(500).json({ error: 'Failed to fetch localities' });
  }
});

const nearbyQuerySchema = z.object({
  localityId: z.coerce.number().int().positive(),
});

// GET /api/places/nearby?localityId=N — nearby localities
router.get('/places/nearby', async (req, res) => {
  const parsed = nearbyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'localityId query param required' });
    return;
  }
  const { localityId } = parsed.data;
  try {
    // First: check explicit localityNeighbors table
    const explicit = await db
      .select({ id: localities.id, name: localities.name, slug: localities.slug })
      .from(localityNeighbors)
      .innerJoin(localities, eq(localityNeighbors.neighborId, localities.id))
      .where(and(eq(localityNeighbors.localityId, localityId), eq(localities.isActive, true)))
      .orderBy(asc(localities.name))
      .limit(5);

    if (explicit.length > 0) {
      res.json({ nearby: explicit });
      return;
    }

    // Fallback: other active localities in the same city
    const source = await db
      .select({ cityId: localities.cityId })
      .from(localities)
      .where(eq(localities.id, localityId))
      .limit(1)
      .then(rows => rows[0]);

    if (!source) {
      res.json({ nearby: [] });
      return;
    }

    const fallback = await db
      .select({ id: localities.id, name: localities.name, slug: localities.slug })
      .from(localities)
      .where(
        and(
          eq(localities.cityId, source.cityId),
          eq(localities.isActive, true),
          ne(localities.id, localityId),
        ),
      )
      .orderBy(asc(localities.name))
      .limit(5);

    res.json({ nearby: fallback });
  } catch (err) {
    logger.error('nearby localities fetch error', err);
    res.status(500).json({ error: 'Failed to fetch nearby localities' });
  }
});

export default router;
