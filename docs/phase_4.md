# Phase 4 — V1 Utilities

## Objective
Build the four decision-making utilities that improve trust and conversion: EMI Calculator, Rent Estimator, Price Trends (synthetic), and Contact-Gated Reviews. These attach directly to listings and locality pages, turning ZingBrokers from a directory into a property intelligence tool.

## Status: NOT_STARTED

## Dependencies
- Phase 1 COMPLETED (locality domain model needed for rent estimates + trends)
- Phase 2 COMPLETED (Redis needed for caching utility API responses)

---

## Subtasks

### 4.1 — EMI Calculator (frontend only)
**File:** `client/components/utilities/EMICalculator.tsx`

Pure client component. No API call needed.

Formula:
```
EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
P = principal, r = monthly interest rate, n = tenure months
```

Inputs:
- Loan amount (pre-filled from listing price × some deposit multiplier)
- Interest rate (default 8.5%)
- Tenure months (default 12)

Output: Monthly EMI amount with breakdown.

Placement: Listing detail page sidebar + city/locality SEO pages as a floating widget.

---

### 4.2 — Rent Estimator API endpoint
**File:** `server/src/routes/utilities.ts` (new file)

```
GET /api/utilities/rent-estimate/:localityId
```

Logic:
1. Query `listings` where `locality_id = :localityId` AND `status = 'active'` AND `intent = 'rent'`
2. Compute: median price, min price, max price, sample size
3. Break down by `room_type` (single/double/shared)
4. Return estimate with confidence label based on sample size

Response:
```ts
{
  localityId: number,
  localityName: string,
  overall: { median, min, max, sampleSize },
  byRoomType: {
    single: { median, min, max, count },
    double: { median, min, max, count },
    shared: { median, min, max, count },
  },
  confidence: 'high' | 'medium' | 'low'  // based on sampleSize
}
```

Cache key: `util:rent-est:{localityId}` → TTL 6 hours

---

### 4.3 — Price Trends API endpoint (synthetic)
**File:** `server/src/routes/utilities.ts`

```
GET /api/utilities/price-trends/:localityId
```

Synthetic model: group listings by `created_at` month bucket, compute average price per bucket. This approximates historical trend until real snapshots exist (Phase 6).

Logic:
```sql
SELECT 
  DATE_TRUNC('month', created_at) AS month,
  AVG(price) AS avg_price,
  COUNT(*) AS count
FROM listings
WHERE locality_id = :localityId
  AND status = 'active'
  AND intent = 'rent'
GROUP BY month
ORDER BY month ASC
LIMIT 12
```

Response:
```ts
{
  localityId: number,
  dataType: 'synthetic',  // flag to distinguish from real snapshots in Phase 6
  trend: { month: string, avgPrice: number, count: number }[],
  direction: 'rising' | 'falling' | 'stable'
}
```

Cache key: `util:trends:{localityId}` → TTL 6 hours

---

### 4.4 — Register utilities router in Express
**File:** `server/src/index.ts`

```ts
import utilitiesRouter from './routes/utilities';
app.use('/api/utilities', utilitiesRouter);
```

---

### 4.5 — RentEstimator frontend widget
**File:** `client/components/utilities/RentEstimator.tsx`

- Fetches `/api/utilities/rent-estimate/:localityId` on mount
- Shows median rent with confidence badge
- Breakdown table: single / double / shared
- Placement: locality SEO pages + listing detail sidebar

---

### 4.6 — PriceTrends chart component
**File:** `client/components/utilities/PriceTrends.tsx`

- Fetches `/api/utilities/price-trends/:localityId` on mount
- Renders line chart using Recharts (or native SVG for minimal deps)
- Shows "Based on listing data" disclaimer (synthetic model)
- Direction badge: "Prices Rising / Falling / Stable"
- Placement: locality SEO pages

Install Recharts if not present:
```bash
cd client && npm install recharts
```

---

### 4.7 — Reviews schema
**File:** `server/src/db/schema.ts`

Add:
```ts
export const reviewStatusEnum = pgEnum('review_status', ['pending', 'approved', 'rejected']);

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  listingId: integer('listing_id').references(() => listings.id, { onDelete: 'cascade' }).notNull(),
  rating: integer('rating').notNull(), // 1-5
  body: text('body').notNull(),
  status: reviewStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('reviews_user_listing_uniq').on(t.userId, t.listingId), // one review per user per listing
  index('reviews_listing_idx').on(t.listingId),
  index('reviews_status_idx').on(t.status),
]);
```

Run `drizzle-kit generate && drizzle-kit migrate` after adding.

---

### 4.8 — Reviews POST endpoint (contact-gated)
**File:** `server/src/routes/reviews.ts` (new file)

```
POST /api/reviews
Body: { listingId, rating, body }
Auth: required
```

Gate logic:
1. Check `contact_leads` table: does a row exist for `(userId, listingId)`?
2. If no → return 403 `{ error: 'You must contact the owner before reviewing.' }`
3. Check `reviews` table: unique constraint prevents duplicate reviews.
4. Validate: `rating` must be 1-5, `body` min 20 chars.
5. Insert review with `status: 'pending'`.
6. Return created review.

---

### 4.9 — Reviews GET endpoint
**File:** `server/src/routes/reviews.ts`

```
GET /api/reviews/:listingId
```

- Return only `status = 'approved'` reviews
- Include: `rating`, `body`, `createdAt`, `user.name` (partial: first name only)
- No auth required

---

### 4.10 — ReviewForm + ReviewList components
**File:** `client/components/listings/ReviewForm.tsx`
**File:** `client/components/listings/ReviewList.tsx`

`ReviewList`:
- Fetches `GET /api/reviews/:listingId`
- Shows star ratings + body text + date
- Shows empty state if no approved reviews

`ReviewForm`:
- Only rendered if user has `hasContacted = true` for this listing (check from listing detail API)
- Star input (1-5) + textarea
- Submit to `POST /api/reviews`
- Post-submit: show "Review submitted, pending approval" message

**Placement:** Listing detail page (`client/app/listings/[id]/page.tsx`), below contact section.

---

### 4.11 — Add `hasContacted` to listing detail API response
**File:** `server/src/routes/listings.ts`

When returning listing detail for authenticated user:
- Join `contact_leads` to check if `(userId, listingId)` row exists
- Return `hasContacted: boolean` in response

---

## Step-by-Step Execution Plan

```
1. Build EMICalculator component (pure frontend, no API)
2. Create server/src/routes/utilities.ts with rent-estimate endpoint
3. Create price-trends endpoint in same file
4. Register /api/utilities router in Express
5. Add Redis caching to both endpoints (TTL 6h)
6. Build RentEstimator frontend widget
7. Install Recharts (if needed), build PriceTrends component
8. Add reviews table to schema.ts, run migration
9. Create server/src/routes/reviews.ts with POST (gated) + GET endpoints
10. Register /api/reviews router in Express
11. Add hasContacted field to listing detail API response
12. Build ReviewList component
13. Build ReviewForm component with contact-gate check
14. Wire all components into listing detail page
15. Wire RentEstimator + PriceTrends into locality SEO pages
```

---

## Validation Criteria

All must pass before Phase 4 = COMPLETED:

- [ ] EMI Calculator renders, computes correct monthly amount
- [ ] `GET /api/utilities/rent-estimate/:localityId` returns median/min/max breakdown
- [ ] `GET /api/utilities/price-trends/:localityId` returns monthly trend array
- [ ] Redis caches utility responses (second call is cache hit)
- [ ] `reviews` table exists in DB with correct constraints
- [ ] `POST /api/reviews` blocked (403) if user has NOT contacted owner
- [ ] `POST /api/reviews` succeeds when `contact_leads` row exists
- [ ] Duplicate review blocked (409 or unique constraint error)
- [ ] `GET /api/reviews/:listingId` returns only approved reviews
- [ ] ReviewForm renders only when `hasContacted = true`
- [ ] ReviewList renders approved reviews on listing detail page
- [ ] RentEstimator widget renders on locality SEO page
- [ ] PriceTrends chart renders with synthetic data
