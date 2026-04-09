import { Router } from 'express';
import { z } from 'zod';
import { listingsIndex } from '../services/search';

const router = Router();

const VALID_SORT_FIELDS = ['completeness_score:desc', 'completeness_score:asc', 'price:asc', 'price:desc', 'created_at:desc', 'created_at:asc'];

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const searchQuerySchema = z.object({
  q: z.string().max(200).default(''),
  city: z.string().max(100).optional(),
  locality: z.string().max(100).optional(),
  cityId: z.coerce.number().int().positive().optional(),
  localityId: z.coerce.number().int().positive().optional(),
  city_id: z.coerce.number().int().positive().optional(),
  locality_id: z.coerce.number().int().positive().optional(),
  intent: z.enum(['buy', 'rent']).optional(),
  room_type: z.enum(['single', 'double', 'shared']).optional(),
  property_type: z.enum(['pg', 'hostel', 'apartment', 'flat']).optional(),
  food_included: z.enum(['true', 'false']).optional(),
  gender: z.enum(['male', 'female', 'any']).optional(),
  price_min: z.coerce.number().int().positive().optional(),
  price_max: z.coerce.number().int().positive().optional(),
  sort: z.string().optional().transform(v => VALID_SORT_FIELDS.includes(v ?? '') ? v! : 'completeness_score:desc'),
});

// GET /api/search?q=&city=&locality=&room_type=&property_type=&food_included=&gender=&price_min=&price_max=
router.get('/', async (req, res) => {
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

  const filters: string[] = ['status = "active"'];
  if (city) filters.push(`city = "${escapeFilterValue(city)}"`);
  if (locality) filters.push(`locality = "${escapeFilterValue(locality)}"`);
  if (cityId !== undefined || city_id !== undefined) filters.push(`city_id = ${cityId ?? city_id}`);
  if (localityId !== undefined || locality_id !== undefined) filters.push(`locality_id = ${localityId ?? locality_id}`);
  if (intent) filters.push(`intent = "${intent}"`);
  if (room_type) filters.push(`room_type = "${room_type}"`);
  if (property_type) filters.push(`property_type = "${property_type}"`);
  if (food_included === 'true') filters.push('food_included = true');
  if (gender) filters.push(`gender_pref = "${gender}" OR gender_pref = "any"`);
  if (price_min !== undefined) filters.push(`price >= ${price_min}`);
  if (price_max !== undefined) filters.push(`price <= ${price_max}`);

  try {
    const results = await listingsIndex.search(q, {
      filter: filters.join(' AND '),
      sort: [sort],
      limit: 30,
    });
    res.json(results);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search unavailable' });
  }
});

export default router;
