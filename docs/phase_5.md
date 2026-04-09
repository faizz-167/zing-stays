# Phase 5 — Analytics & Background Jobs

## Objective
Integrate PostHog for full-funnel conversion tracking. Replace synchronous Meilisearch calls with async BullMQ job queues. Improve Meilisearch ranking with locality-awareness and freshness signals. Build the background processing backbone.

## Status: NOT_STARTED

## Dependencies
- Phase 1 COMPLETED (domain model stable for accurate event tagging)
- Phase 2 COMPLETED (Redis required by BullMQ)
- Phase 3 COMPLETED (SEO pages must exist for funnel tracking to be meaningful)

---

## Subtasks

### 5.1 — PostHog client setup in Next.js
**File:** `client/app/layout.tsx` or `client/components/providers/PostHogProvider.tsx`

```bash
cd client && npm install posthog-js
```

```ts
// client/components/providers/PostHogProvider.tsx
'use client';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PHProvider({ children }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      capture_pageview: false, // manually track for SPA accuracy
    });
  }, []);
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
```

Add `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example`.

---

### 5.2 — Track page views (manual)
**File:** `client/components/providers/PostHogProvider.tsx`

Use `usePathname` + `useSearchParams` to fire `$pageview` on route changes:
```ts
posthog.capture('$pageview', { path: pathname });
```

Tag SEO pages differently:
- `page_type: 'seo_city'` on `/{city}`
- `page_type: 'seo_locality'` on `/{city}/{locality}`
- `page_type: 'listing_detail'` on `/listings/[id]`
- `page_type: 'search'` on `/listings`

---

### 5.3 — Track key user events

**Contact Reveal** (`client/components/listings/ContactButton.tsx`):
```ts
posthog.capture('contact_revealed', {
  listing_id: listingId,
  city: city,
  locality: locality,
  property_type: propertyType,
  page_type: 'listing_detail',
});
```

**Listing Saved** (`client/hooks/useFavorites.ts`):
```ts
posthog.capture('listing_saved', { listing_id, city, locality });
```

**Search Performed** (`client/hooks/useSearch.ts`):
```ts
posthog.capture('search_performed', {
  query: searchQuery,
  filters: activeFilters,
  result_count: results.length,
});
```

**Review Submitted** (`client/components/listings/ReviewForm.tsx`):
```ts
posthog.capture('review_submitted', { listing_id, rating });
```

---

### 5.4 — SEO funnel tracking
Track the full funnel for SEO page visitors:

1. `seo_page_viewed` — on any SEO page load: `{ city, locality, property_type, page_type }`
2. `seo_listing_clicked` — when user clicks listing card on SEO page
3. `contact_revealed` — already tracked (step 5.3)

This creates the funnel: `seo_page_viewed → seo_listing_clicked → contact_revealed`

**File:** `client/components/seo/ListingCard.tsx` (SEO variant)

Add onClick handler that fires `seo_listing_clicked` before navigating.

---

### 5.5 — Install BullMQ on Express
**File:** `server/package.json`

```bash
cd server && npm install bullmq
```

**File:** `server/src/lib/queues.ts` (new file)
```ts
import { Queue, Worker } from 'bullmq';
import { redis } from './redis';

const connection = { host: redis.options.host, port: redis.options.port };

export const searchIndexQueue = new Queue('search-indexing', { connection });
export const moderationQueue = new Queue('review-moderation', { connection });
```

---

### 5.6 — `search-indexing` queue
**File:** `server/src/workers/searchIndexWorker.ts`

Replace all direct `meilisearch.index('listings').addDocuments(...)` calls in routes with:
```ts
await searchIndexQueue.add('index-listing', { listingId, action: 'upsert' });
await searchIndexQueue.add('index-listing', { listingId, action: 'delete' });
```

Worker logic:
- `action: 'upsert'` → fetch listing from DB → push to Meilisearch
- `action: 'delete'` → remove from Meilisearch index

Start worker in `server/src/index.ts`.

---

### 5.7 — `review-moderation` queue
**File:** `server/src/workers/moderationWorker.ts`

When a review is submitted (POST /api/reviews):
```ts
await moderationQueue.add('moderate-review', { reviewId });
```

Worker logic (Phase 1 — simple auto-approval rules):
- Body length >= 20 chars → auto-approve
- Rating out of 1-5 range → auto-reject
- Contains flagged words (configurable list) → hold as `pending`

Full admin moderation UI built in Phase 6.

---

### 5.8 — Improve Meilisearch ranking
**File:** `server/src/services/search.ts`

Update Meilisearch index settings:

```ts
await index.updateSettings({
  searchableAttributes: ['title', 'locality', 'city', 'description', 'amenities'],
  filterableAttributes: ['cityId', 'localityId', 'intent', 'propertyType', 'roomType', 'status', 'price', 'genderPref'],
  sortableAttributes: ['price', 'createdAt', 'completenessScore'],
  rankingRules: [
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
    'completenessScore:desc',  // custom: prefer complete listings
    'createdAt:desc',           // prefer fresher listings
  ],
});
```

---

### 5.9 — Add `localityId` and `cityId` to Meilisearch documents
**File:** `server/src/services/search.ts`

When building the document to index, include:
```ts
{
  id: listing.id,
  cityId: listing.cityId,
  localityId: listing.localityId,
  intent: listing.intent,
  // ... all other existing fields
}
```

This enables fast client-side filtering on SEO pages via Meilisearch.

---

## Step-by-Step Execution Plan

```
1. Install posthog-js in client
2. Create PostHogProvider, wrap root layout
3. Add manual pageview tracking with page_type tags
4. Add contact_revealed event to ContactButton
5. Add listing_saved event to useFavorites hook
6. Add search_performed event to useSearch hook
7. Add seo_page_viewed tracking to SEO page components
8. Add seo_listing_clicked tracking to SEO listing cards
9. Install BullMQ in server
10. Create server/src/lib/queues.ts
11. Create searchIndexWorker.ts — replace direct Meilisearch calls
12. Create moderationWorker.ts with auto-approve rules
13. Start workers in server/src/index.ts
14. Update Meilisearch settings (ranking, filterable attrs)
15. Update indexed document shape to include cityId, localityId, intent
16. Re-index all active listings
```

---

## Validation Criteria

All must pass before Phase 5 = COMPLETED:

- [ ] PostHog `$pageview` fires on every route change
- [ ] `contact_revealed` event captured in PostHog dashboard
- [ ] `listing_saved` event captured in PostHog dashboard
- [ ] `search_performed` event captured with correct filters payload
- [ ] `seo_page_viewed` fires on city/locality page load
- [ ] BullMQ workers start without errors on server boot
- [ ] Listing create/update queues a search-indexing job (no direct Meilisearch call)
- [ ] Meilisearch index contains `cityId`, `localityId`, `intent` on documents
- [ ] Filter by `cityId` in Meilisearch returns correct results
- [ ] New review submission triggers moderation queue job
- [ ] Simple reviews auto-approve via worker logic
