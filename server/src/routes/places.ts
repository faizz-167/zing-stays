import { Router } from 'express';
import { db } from '../db';
import { cities, localities, localityNeighbors } from '../db/schema';
import { and, eq, ne, asc } from 'drizzle-orm';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { ValidationError } from '../lib/errors';

const router = Router();

// GET /api/cities — all active cities
router.get('/cities', asyncHandler(async (_req, res) => {
  const rows = await db
    .select({ id: cities.id, name: cities.name, slug: cities.slug, state: cities.state })
    .from(cities)
    .where(eq(cities.isActive, true))
    .orderBy(asc(cities.name));
  res.json({ data: rows });
}));

const localitiesQuerySchema = z.object({
  cityId: z.coerce.number().int().positive(),
});

// GET /api/localities?cityId=N — localities for a city
router.get(['/localities', '/cities/localities'], asyncHandler(async (req, res) => {
  const parsed = localitiesQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ValidationError('cityId query param required');

  const rows = await db
    .select({ id: localities.id, name: localities.name, slug: localities.slug, cityId: localities.cityId })
    .from(localities)
    .where(and(eq(localities.cityId, parsed.data.cityId), eq(localities.isActive, true)))
    .orderBy(asc(localities.name));
  res.json({ data: rows });
}));

const nearbyQuerySchema = z.object({
  localityId: z.coerce.number().int().positive(),
});

// GET /api/places/nearby?localityId=N — nearby localities
router.get('/places/nearby', asyncHandler(async (req, res) => {
  const parsed = nearbyQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ValidationError('localityId query param required');

  const { localityId } = parsed.data;

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
}));

export default router;
