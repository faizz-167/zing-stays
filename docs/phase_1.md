# Phase 1 — Database & Domain Foundation

## Objective
Replace raw city/locality string columns in `listings` with normalized FK references to `cities` and `localities` tables. Introduce `intent` (buy/rent) as a first-class domain concept. Maintain backward compatibility via dual-schema support during rollout.

## Status: COMPLETED

## Dependencies
- None. This is the foundational phase. All other phases depend on it.

---

## Subtasks

### 1.1 — Create `cities` table
**File:** `server/src/db/schema.ts`

Add:
```ts
export const cities = pgTable('cities', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(), // e.g. "chennai"
  state: varchar('state', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('cities_slug_idx').on(t.slug),
]);
```

---

### 1.2 — Create `localities` table
**File:** `server/src/db/schema.ts`

Add:
```ts
export const localities = pgTable('localities', {
  id: serial('id').primaryKey(),
  cityId: integer('city_id').references(() => cities.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(), // e.g. "velachery"
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('localities_city_slug_idx').on(t.cityId, t.slug),
  index('localities_city_idx').on(t.cityId),
]);
```

---

### 1.3 — Add nullable FK columns to `listings` (dual-schema)
**File:** `server/src/db/schema.ts`

Add to `listings` table (nullable — old rows won't have them yet):
```ts
cityId: integer('city_id').references(() => cities.id).notNull().default(sql`NULL`), // nullable initially
localityId: integer('locality_id').references(() => localities.id), // nullable initially
```

> DUAL-SCHEMA RULE: Keep existing `city` (varchar) and `locality` (varchar) columns intact. Do NOT drop them in this phase.

---

### 1.4 — Add `intent` enum to `listings`
**File:** `server/src/db/schema.ts`

Add enum and field:
```ts
export const intentEnum = pgEnum('intent', ['buy', 'rent']);

// In listings table:
intent: intentEnum('intent').default('rent').notNull(),
```

---

### 1.5 — Write backfill script
**File:** `server/src/scripts/backfill-locations.ts`

Logic:
1. Query all distinct `city` values from `listings`.
2. For each city: insert into `cities` if not exists → get `id`.
3. For each distinct `(city, locality)` pair: insert into `localities` if not exists → get `id`.
4. Update `listings` rows: set `city_id` and `locality_id` from the new tables.
5. Log backfill summary.

Run once, idempotent (use `ON CONFLICT DO NOTHING`).

---

### 1.6 — Generate and run Drizzle migrations
**Command:**
```bash
cd server && npx drizzle-kit generate && npx drizzle-kit migrate
```

Verify:
- `cities` table exists with slug index.
- `localities` table exists with city FK.
- `listings` has `city_id`, `locality_id`, `intent` columns (nullable).
- Old `city`, `locality` string columns still exist.

---

### 1.7 — Update listing create/edit routes to accept new fields
**File:** `server/src/routes/listings.ts`

- Add `cityId`, `localityId`, `intent` to listing creation/update Zod schema.
- Write both: new FK fields AND legacy string fields (copy `cities.name` → `city`, `localities.name` → `locality` for backward compat).
- Return `cityId`, `localityId`, `intent` in listing responses.

---

### 1.8 — Update listing form in frontend
**File:** `client/app/dashboard/listings/[id]/edit/page.tsx` + create listing page

- Replace free-text city/locality inputs with select dropdowns.
- Fetch `/api/cities` and `/api/localities?cityId=X` for dropdown data.
- Add intent select: "Looking to Rent" / "Looking to Buy".
- Submit `cityId`, `localityId`, `intent` fields.

---

### 1.9 — Add `/api/cities` and `/api/localities` endpoints
**File:** `server/src/routes/listings.ts` or new `server/src/routes/places.ts`

```
GET /api/cities         → Return all active cities
GET /api/localities     → Query param: ?cityId=N → return localities for city
```

Cache both in Redis (TTL: 24h) once Redis is available (Phase 2). For now, direct DB query is fine.

---

### 1.10 — Add locality+city to Meilisearch index
**File:** `server/src/services/search.ts`

- Add `cityId`, `localityId`, `intent` to indexed fields.
- Add as `filterableAttributes` in Meilisearch settings.
- Re-index all existing listings after backfill.

---

## Step-by-Step Execution Plan

```
1. Update schema.ts: add cities, localities tables + intent enum
2. Add cityId, localityId, intent columns to listings (nullable)
3. Run: npx drizzle-kit generate && npx drizzle-kit migrate
4. Seed initial cities (Chennai, Mumbai, Delhi, Bangalore, Hyderabad, Pune)
5. Write and run backfill script
6. Add /api/cities and /api/localities endpoints
7. Update listing create/edit routes + Zod schemas
8. Update frontend listing form dropdowns
9. Update Meilisearch index schema + re-index
10. Validate dual-schema: old string fields still readable
```

---

## Validation Criteria

All must pass before Phase 1 = COMPLETED:

- [ ] `cities` and `localities` tables exist in Postgres with correct indices
- [ ] `listings` table has `city_id`, `locality_id`, `intent` columns
- [ ] Backfill: all existing listings have non-null `city_id` and `locality_id`
- [ ] Legacy `city` and `locality` string columns still present and populated
- [ ] `GET /api/cities` returns list of cities
- [ ] `GET /api/localities?cityId=1` returns correct localities
- [ ] New listings can be created with `cityId`, `localityId`, `intent`
- [ ] Meilisearch filters by `cityId`, `localityId`, `intent` work correctly
- [ ] No existing functionality broken (search, favorites, admin panel)
