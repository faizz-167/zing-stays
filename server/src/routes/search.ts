import { Router } from 'express';
import { z } from 'zod';
import { listingsIndex } from '../services/search';
import { buildSearchFilters, normalizeSortField } from '../lib/searchFilters';
import { searchLimiter } from '../middleware/rateLimit';
import { logger } from '../lib/logger';

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().max(200).default(''),
  city: z.string().max(100).optional(),
  locality: z.string().max(100).optional(),
  cityId: z.coerce.number().int().positive().optional(),
  localityId: z.coerce.number().int().positive().optional(),
  city_id: z.coerce.number().int().positive().optional(),
  locality_id: z.coerce.number().int().positive().optional(),
  intent: z.enum(['buy', 'rent']).optional(),
  room_type: z.enum(['single', 'double', 'multiple', '1bhk', '2bhk', '3bhk', '4bhk']).optional(),
  property_type: z.enum(['pg', 'hostel', 'apartment', 'flat']).optional(),
  food_included: z.enum(['true', 'false']).optional(),
  gender: z.enum(['male', 'female', 'any']).optional(),
  price_min: z.coerce.number().int().positive().optional(),
  price_max: z.coerce.number().int().positive().optional(),
  sort: z.string().optional().transform((value) => normalizeSortField(value)),
});

// GET /api/search?q=&city=&locality=&room_type=&property_type=&food_included=&gender=&price_min=&price_max=
router.get('/', searchLimiter, async (req, res) => {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message }); return;
  }
  const {
    q,
    city,
    locality,
    cityId,
    localityId,
    city_id,
    locality_id,
    intent,
    room_type,
    property_type,
    food_included,
    gender,
    price_min,
    price_max,
    sort,
  } = parsed.data;

  const filters = buildSearchFilters({
    city,
    locality,
    cityId: cityId ?? city_id,
    localityId: localityId ?? locality_id,
    intent,
    roomType: room_type,
    propertyType: property_type,
    foodIncluded: food_included,
    gender,
    priceMin: price_min,
    priceMax: price_max,
  });

  try {
    const results = await listingsIndex.search(q, {
      filter: filters.join(' AND '),
      sort: [sort],
      limit: 30,
    });
    res.json(results);
  } catch (err) {
    logger.error('Search error', err);
    res.status(500).json({ error: 'Search unavailable' });
  }
});

export default router;
