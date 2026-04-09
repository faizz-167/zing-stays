# ZingBrokers — Global Implementation Status

> Source of truth for all phases and subtasks. All agents must update this file after every progress event.
> Status values: `NOT_STARTED` | `IN_PROGRESS` | `COMPLETED`

---

## Quick Reference

| Phase | Title | Status |
|-------|-------|--------|
| Phase 1 | Database & Domain Foundation | COMPLETED |
| Phase 2 | Auth Refactor & Redis Layer | NOT_STARTED |
| Phase 3 | SEO Infrastructure | NOT_STARTED |
| Phase 4 | V1 Utilities | NOT_STARTED |
| Phase 5 | Analytics & Background Jobs | NOT_STARTED |
| Phase 6 | Content & Scaling | NOT_STARTED |

---

## Phase 1 — Database & Domain Foundation

| # | Subtask | Status | Notes |
|---|---------|--------|-------|
| 1.1 | Create `cities` table (Drizzle schema) | COMPLETED | |
| 1.2 | Create `localities` table with `city_id` FK | COMPLETED | |
| 1.3 | Add `city_id` + `locality_id` FK columns to `listings` (nullable) | COMPLETED | Dual-schema: keep raw `city`/`locality` strings |
| 1.4 | Write backfill script: raw strings → normalized cities/localities | COMPLETED | 1 listing backfilled |
| 1.5 | Add `intent` enum (`buy` \| `rent`) to `listings` table | COMPLETED | |
| 1.6 | Add `intent` to listing form, API, and Meilisearch index | COMPLETED | |
| 1.7 | Generate and run Drizzle migrations | COMPLETED | db:push --force applied |
| 1.8 | Update listing create/edit routes to accept `city_id`/`locality_id` | COMPLETED | |
| 1.9 | Add slug fields to `cities` and `localities` for SEO URLs | COMPLETED | Both tables have slug columns |
| 1.10 | Validate dual-schema: both old string fields and new FKs coexist | COMPLETED | Legacy strings kept, FKs nullable |

## Phase 2 — Auth Refactor & Redis Layer

| # | Subtask | Status | Notes |
|---|---------|--------|-------|
| 2.1 | Install and configure `ioredis` on Express | NOT_STARTED | |
| 2.2 | Refactor JWT: issue token in Secure HTTP-only cookie (not response body) | NOT_STARTED | |
| 2.3 | Update auth middleware to read JWT from cookie | NOT_STARTED | |
| 2.4 | Update client `AuthProvider` to remove local token storage | NOT_STARTED | |
| 2.5 | Verify public SEO pages accessible without auth | NOT_STARTED | |
| 2.6 | Add Redis-backed rate limiting on auth + contact-reveal endpoints | NOT_STARTED | |
| 2.7 | Add Redis cache helper (`get`/`set`/`invalidate` wrapper) | NOT_STARTED | |
| 2.8 | Test cookie auth across dashboard, admin, and public pages | NOT_STARTED | |

## Phase 3 — SEO Infrastructure

| # | Subtask | Status | Notes |
|---|---------|--------|-------|
| 3.1 | Build Express `/api/seo/city/:slug` aggregation endpoint | NOT_STARTED | Returns stats, listing cards, meta |
| 3.2 | Build Express `/api/seo/locality/:citySlug/:localitySlug` endpoint | NOT_STARTED | |
| 3.3 | Build Express `/api/seo/locality/:citySlug/:localitySlug/:type` endpoint | NOT_STARTED | |
| 3.4 | Cache all SEO aggregation responses in Redis (TTL: 1 hour) | NOT_STARTED | |
| 3.5 | Create Next.js `app/[city]/page.tsx` SSR page | NOT_STARTED | |
| 3.6 | Create Next.js `app/[city]/[locality]/page.tsx` SSR page | NOT_STARTED | |
| 3.7 | Create Next.js `app/[city]/[locality]/[type]/page.tsx` SSR page | NOT_STARTED | |
| 3.8 | Add `generateMetadata` + canonical tags to all SEO pages | NOT_STARTED | |
| 3.9 | Add internal links: nearby localities, related types, budget bands | NOT_STARTED | |
| 3.10 | Implement indexation control: `robots` meta + `sitemap.xml` for curated routes | NOT_STARTED | |
| 3.11 | Add `generateStaticParams` for top-demand city/locality combos | NOT_STARTED | ISR fallback for rest |

## Phase 4 — V1 Utilities

| # | Subtask | Status | Notes |
|---|---------|--------|-------|
| 4.1 | Build `EMICalculator` frontend component | NOT_STARTED | Pure client component, no API needed |
| 4.2 | Build `/api/utilities/rent-estimate/:localityId` Express endpoint | NOT_STARTED | Median of active listing prices in locality |
| 4.3 | Build `/api/utilities/price-trends/:localityId` Express endpoint | NOT_STARTED | Synthetic: group listings by `created_at` month buckets |
| 4.4 | Add `RentEstimator` frontend widget on locality SEO pages | NOT_STARTED | |
| 4.5 | Add `PriceTrends` chart component (use Recharts or similar) | NOT_STARTED | |
| 4.6 | Create `reviews` table schema (Drizzle) | NOT_STARTED | Fields: userId, listingId, rating, body, status |
| 4.7 | Build `/api/reviews` POST endpoint with contact-lead gate | NOT_STARTED | Check `contact_leads` row exists before allowing |
| 4.8 | Build `/api/reviews/:listingId` GET endpoint | NOT_STARTED | Return approved reviews only |
| 4.9 | Add `ReviewForm` + `ReviewList` components to listing detail page | NOT_STARTED | |
| 4.10 | Cache rent-estimate and price-trends responses in Redis | NOT_STARTED | TTL: 6 hours |

## Phase 5 — Analytics & Background Jobs

| # | Subtask | Status | Notes |
|---|---------|--------|-------|
| 5.1 | Integrate PostHog client in Next.js (`PostHogProvider`) | NOT_STARTED | |
| 5.2 | Track events: `page_view`, `search_performed`, `listing_viewed` | NOT_STARTED | |
| 5.3 | Track events: `contact_revealed`, `listing_saved`, `review_submitted` | NOT_STARTED | |
| 5.4 | Track SEO page funnel: entry → listing click → contact reveal | NOT_STARTED | |
| 5.5 | Install BullMQ + Redis on Express | NOT_STARTED | |
| 5.6 | Create `search-indexing` queue: re-index listing on create/update/delete | NOT_STARTED | Replace synchronous Meilisearch calls |
| 5.7 | Create `review-moderation` queue: auto-flag low-quality reviews | NOT_STARTED | |
| 5.8 | Improve Meilisearch ranking: add `locality`, `price`, `freshness` as ranking factors | NOT_STARTED | |
| 5.9 | Add Meilisearch `filterableAttributes` for `intent`, `city_id`, `locality_id` | NOT_STARTED | |

## Phase 6 — Content & Scaling

| # | Subtask | Status | Notes |
|---|---------|--------|-------|
| 6.1 | Create `content_pages` table (type: area_guide \| student_guide \| comparison) | NOT_STARTED | |
| 6.2 | Build admin UI for creating/editing content pages | NOT_STARTED | |
| 6.3 | Create Next.js `app/guides/[slug]/page.tsx` SSR page | NOT_STARTED | |
| 6.4 | Add `price_snapshots` table for real historical data | NOT_STARTED | locality_id, avg_price, snapshot_date |
| 6.5 | Build BullMQ job to snapshot locality prices weekly | NOT_STARTED | Replaces synthetic trend model |
| 6.6 | Implement review moderation UI in admin panel | NOT_STARTED | approve/reject actions |
| 6.7 | Remove legacy `city`/`locality` string columns from `listings` | NOT_STARTED | Only after backfill + dual-schema verified |
| 6.8 | Expand `generateStaticParams` to all high-demand routes from PostHog data | NOT_STARTED | |

---

## Legend

```
NOT_STARTED  — Work has not begun
IN_PROGRESS  — Currently being implemented
COMPLETED    — Done and validated
```

> Last updated: Phase planning created. No work started yet.
