# Phase 6 — Content, Scaling & Legacy Cleanup

## Objective
Build the light content engine (locality guides), replace synthetic price trends with real historical snapshots, build review moderation admin UI, remove legacy dual-schema string columns, and expand SEO coverage based on PostHog demand data.

## Status: NOT_STARTED

## Dependencies
- Phase 1 COMPLETED (domain model for content locality linking)
- Phase 3 COMPLETED (SEO routing infrastructure for guide pages)
- Phase 4 COMPLETED (reviews schema + synthetic trends in place)
- Phase 5 COMPLETED (PostHog data needed for demand-based SEO expansion; BullMQ for scheduled jobs)

---

## Subtasks

### 6.1 — `content_pages` table schema
**File:** `server/src/db/schema.ts`

```ts
export const contentTypeEnum = pgEnum('content_type', [
  'area_guide',
  'student_guide',
  'comparison',
  'rent_advice',
  'locality_insight',
]);

export const contentPages = pgTable('content_pages', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  type: contentTypeEnum('type').notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  body: text('body').notNull(),          // Markdown or HTML
  cityId: integer('city_id').references(() => cities.id),
  localityId: integer('locality_id').references(() => localities.id),
  isPublished: boolean('is_published').default(false).notNull(),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('content_slug_idx').on(t.slug),
  index('content_city_idx').on(t.cityId),
  index('content_type_idx').on(t.type),
]);
```

Run migration.

---

### 6.2 — Content API endpoints
**File:** `server/src/routes/content.ts` (new file)

```
GET  /api/content/:slug         → Public: fetch published page by slug
GET  /api/content?cityId=X      → Public: list published pages for a city
POST /api/content               → Admin only: create page
PUT  /api/content/:id           → Admin only: update page
DELETE /api/content/:id         → Admin only: delete page
```

---

### 6.3 — Content admin UI
**File:** `client/app/admin/content/page.tsx`
**File:** `client/app/admin/content/[id]/edit/page.tsx`

Admin interface for creating and editing content pages:
- Title, slug, type selector, city/locality dropdowns
- Textarea for body (Markdown input)
- Publish/unpublish toggle
- Preview panel

Only accessible to `isAdmin = true` users (reuse existing admin auth middleware).

---

### 6.4 — `app/guides/[slug]/page.tsx` SSR guide page
**File:** `client/app/guides/[slug]/page.tsx`

```ts
// Server Component
export async function generateMetadata({ params }) {
  const page = await fetch(`${API_URL}/api/content/${params.slug}`);
  return { title: page.title, description: page.body.slice(0, 160) };
}

export default async function GuidePage({ params }) {
  const page = await fetch(`${API_URL}/api/content/${params.slug}`);
  // Render: title, body (parse Markdown), related listings, locality links
}
```

Add guide links to locality SEO pages (`client/app/[city]/[locality]/page.tsx`).

---

### 6.5 — `price_snapshots` table schema
**File:** `server/src/db/schema.ts`

```ts
export const priceSnapshots = pgTable('price_snapshots', {
  id: serial('id').primaryKey(),
  localityId: integer('locality_id').references(() => localities.id, { onDelete: 'cascade' }).notNull(),
  snapshotDate: timestamp('snapshot_date').notNull(),
  avgPrice: integer('avg_price').notNull(),
  medianPrice: integer('median_price').notNull(),
  minPrice: integer('min_price').notNull(),
  maxPrice: integer('max_price').notNull(),
  sampleSize: integer('sample_size').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('snapshots_locality_date_idx').on(t.localityId, t.snapshotDate),
]);
```

Run migration.

---

### 6.6 — Weekly price snapshot BullMQ job
**File:** `server/src/workers/priceSnapshotWorker.ts`

Schedule using BullMQ `repeat` option:
```ts
await snapshotQueue.add('take-snapshot', {}, {
  repeat: { cron: '0 0 * * 0' }, // every Sunday midnight
});
```

Worker logic:
1. For each active `locality_id` with >= 5 listings
2. Compute avg, median, min, max prices for active listings
3. Insert row into `price_snapshots`
4. Invalidate Redis cache for `util:trends:{localityId}`

After first snapshot run, update `/api/utilities/price-trends/:localityId`:
- Prefer `price_snapshots` data if available (real)
- Fall back to synthetic model only if no snapshots exist
- Change `dataType` field from `'synthetic'` to `'historical'`

---

### 6.7 — Review moderation admin UI
**File:** `client/app/admin/reviews/page.tsx`

- List all `status = 'pending'` reviews with: reviewer name, listing title, rating, body excerpt
- Action buttons: Approve / Reject
- On approve: `PATCH /api/reviews/:id` → `{ status: 'approved' }`
- On reject: `PATCH /api/reviews/:id` → `{ status: 'rejected' }`

**File:** `server/src/routes/reviews.ts`

Add admin-only endpoint:
```
PATCH /api/reviews/:id   → Admin: update review status
GET   /api/reviews/admin → Admin: list all reviews by status filter
```

---

### 6.8 — Remove legacy dual-schema string columns
**File:** `server/src/db/schema.ts`

Remove from `listings` table:
```ts
// DELETE these two columns:
city: varchar('city', { length: 100 }).notNull(),
locality: varchar('locality', { length: 100 }).notNull(),
```

**Pre-conditions before executing this task:**
- All listings have non-null `city_id` and `locality_id` (verified in Phase 1)
- All routes use `cityId`/`localityId` exclusively (no reference to raw string fields)
- All Meilisearch documents use `cityId`/`localityId`
- A DB backup has been taken

Write and run migration to drop the columns.
Update all TypeScript types.

---

### 6.9 — Expand SEO routes based on PostHog demand data
**File:** `client/app/[city]/page.tsx` — `generateStaticParams`

Query PostHog (via API or export) for top 100 city/locality combinations by `seo_page_viewed` event count. Pre-build those pages statically. All others remain ISR.

Also expand:
- Add `/{city}/{locality}/under-{budget}` routes for top budget bands from listing data distribution
- Budget bands: under-5000, under-8000, under-10000, under-15000, under-20000

**File:** `server/src/routes/seo.ts` — add budget band endpoint:
```
GET /api/seo/locality/:citySlug/:localitySlug/budget/:band
```

---

## Step-by-Step Execution Plan

```
1. Add content_pages + price_snapshots tables to schema.ts
2. Run Drizzle migrations
3. Create server/src/routes/content.ts with public + admin endpoints
4. Build admin content management UI (list, create, edit)
5. Create client/app/guides/[slug]/page.tsx SSR guide page
6. Link guide pages from locality SEO pages
7. Create priceSnapshotWorker.ts with weekly BullMQ cron job
8. Update price-trends API to prefer real snapshots over synthetic
9. Build review moderation admin UI (pending queue)
10. Add PATCH /api/reviews/:id admin endpoint
11. Run pre-checks for dual-schema removal
12. Take DB backup
13. Remove legacy city/locality string columns from schema + migration
14. Update all routes + types that referenced raw string fields
15. Pull PostHog demand data for top SEO routes
16. Expand generateStaticParams for top-demand combinations
17. Add budget band SEO endpoints + pages
```

---

## Validation Criteria

All must pass before Phase 6 = COMPLETED:

- [ ] `content_pages` table exists and accepts create/update operations
- [ ] Admin can create and publish a locality guide via UI
- [ ] `/guides/[slug]` page renders published content server-side
- [ ] `price_snapshots` table exists
- [ ] Weekly snapshot job registers in BullMQ and runs on schedule
- [ ] After first snapshot run, price-trends API returns `dataType: 'historical'`
- [ ] Admin review moderation queue shows pending reviews
- [ ] Admin can approve/reject reviews; status updates in DB
- [ ] Legacy `city` and `locality` string columns dropped from `listings`
- [ ] All queries use `city_id`/`locality_id` exclusively after column removal
- [ ] Budget band SEO pages render and return filtered listings
- [ ] No regressions in existing listing create/search/display flows
