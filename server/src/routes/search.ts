import { Router } from 'express';
import { z } from 'zod';
import { listingsIndex } from '../services/search';
import { buildSearchFilters, normalizeSortField } from '../lib/searchFilters';
import { searchLimiter } from '../middleware/rateLimit';
import { roomTypeValues } from '../lib/listingFields';
import { toIntArray, toStringArray } from '../lib/routeUtils';
import { asyncHandler } from '../lib/asyncHandler';
import { ValidationError } from '../lib/errors';

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().max(200).default(''),
  city: z.string().max(100).optional(),
  locality: z.string().max(100).optional(),
  cityId: z.coerce.number().int().positive().optional(),
  city_id: z.coerce.number().int().positive().optional(),
  intent: z.enum(['buy', 'rent']).optional(),
  room_type: z.enum(roomTypeValues).optional(),
  property_type: z.enum(['pg', 'hostel', 'apartment', 'flat']).optional(),
  food_included: z.enum(['true', 'false']).optional(),
  foodIncluded: z.enum(['true', 'false']).optional(),
  gender: z.enum(['male', 'female', 'any']).optional(),
  genderPref: z.enum(['male', 'female', 'any']).optional(),
  price_min: z.coerce.number().int().positive().optional(),
  price_max: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().int().positive().optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  availability: z.enum(['now', 'soon', 'any']).optional(),
  sort: z.string().optional().transform((value) => normalizeSortField(value)),
});

// GET /api/search
router.get('/', searchLimiter, asyncHandler(async (req, res) => {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);

  const {
    q, city, locality, cityId, city_id, intent, room_type,
    property_type, food_included, foodIncluded, gender, genderPref,
    price_min, price_max, minPrice, maxPrice, availability, sort,
  } = parsed.data;

  // Parse multi-value params that Zod can't handle natively (repeated keys)
  const localityIds = toIntArray(req.query['localityId']);
  const localityIdLegacy = toIntArray(req.query['locality_id']);
  const resolvedLocalityIds = localityIds ?? localityIdLegacy;

  const rawRoomTypes = toStringArray(req.query['roomType']);
  const validRoomTypes = rawRoomTypes?.filter(
    (rt): rt is (typeof roomTypeValues)[number] => roomTypeValues.includes(rt as (typeof roomTypeValues)[number]),
  );

  const effectiveRoomType = validRoomTypes && validRoomTypes.length > 0
    ? validRoomTypes
    : room_type
      ? [room_type]
      : undefined;

  const rawPropertyTypes = toStringArray(req.query['propertyType']);
  const validPropertyTypes = rawPropertyTypes?.filter(
    (pt): pt is 'pg' | 'hostel' | 'apartment' | 'flat' =>
      ['pg', 'hostel', 'apartment', 'flat'].includes(pt),
  );
  const effectivePropertyTypes =
    validPropertyTypes && validPropertyTypes.length > 0
      ? validPropertyTypes
      : property_type
        ? [property_type]
        : undefined;

  const VALID_PREFERRED_TENANTS = ['students', 'working', 'family', 'any'] as const;
  const VALID_FURNISHING = ['furnished', 'semi', 'unfurnished'] as const;

  const rawPreferredTenants = toStringArray(req.query['preferredTenants']);
  const preferredTenants = rawPreferredTenants?.filter((t): t is typeof VALID_PREFERRED_TENANTS[number] =>
    (VALID_PREFERRED_TENANTS as readonly string[]).includes(t),
  );

  const rawFurnishing = toStringArray(req.query['furnishing']);
  const furnishing = rawFurnishing?.filter((f): f is typeof VALID_FURNISHING[number] =>
    (VALID_FURNISHING as readonly string[]).includes(f),
  );

  const filters = buildSearchFilters({
    city, locality, cityId: cityId ?? city_id, localityIds: resolvedLocalityIds,
    intent, roomType: effectiveRoomType as (typeof roomTypeValues)[number][] | undefined,
    propertyType: effectivePropertyTypes, foodIncluded: foodIncluded ?? food_included,
    gender: genderPref ?? gender, priceMin: minPrice ?? price_min,
    priceMax: maxPrice ?? price_max, availability, preferredTenants, furnishing,
  });

  const results = await listingsIndex.search(q, {
    filter: filters.join(' AND '),
    sort: [sort],
    limit: 30,
  });
  res.json(results);
}));

export default router;
