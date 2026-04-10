import { Router } from 'express';
import { db } from '../db';
import { cities, localities } from '../db/schema';
import { and, eq, asc } from 'drizzle-orm';
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

export default router;
