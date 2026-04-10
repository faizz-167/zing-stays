# ZingBrokers — Implementation Status

> Central tracking file. All agents must update this file after every task.
> Never skip status updates. A phase is only COMPLETED when all subtasks are COMPLETED and validation criteria are satisfied.

---

## Legend

| Status | Meaning |
|--------|---------|
| `NOT_STARTED` | Work not yet begun |
| `IN_PROGRESS` | Actively being worked on |
| `COMPLETED` | Done and validated |
| `BLOCKED` | Blocked by dependency or issue |

---

## Phase Overview

| Phase | Title | Status | Notes |
|-------|-------|--------|-------|
| 1 | Security & Review Fixes | `COMPLETED` | Highest priority — do first |
| 2 | Schema Cleanup & Foundation | `COMPLETED` | Depends on Phase 1 |
| 3 | Authentication Redesign | `COMPLETED` | Depends on Phase 2 |
| 4 | Guided Search Widget | `NOT_STARTED` | Depends on Phase 3 |
| 5 | Filter Panel Redesign | `NOT_STARTED` | Depends on Phase 4 |
| 6 | Listing Card Redesign | `NOT_STARTED` | Depends on Phase 5 |
| 7 | EMI Calculator Visibility | `NOT_STARTED` | Independent, can run parallel to Phase 6 |

---

## Phase 1 — Security & Review Fixes

| Subtask | Status | Notes |
|---------|--------|-------|
| 1.1 Block owner self-review on backend (`reviews.ts`) | `COMPLETED` | Fetch listing, compare `ownerId === userId`, return 403 |
| 1.2 Block owner self-lead on backend (`listings.ts` contact reveal) | `COMPLETED` | Check if requester is owner before revealing contact |
| 1.3 Fix review moderation queue silent failure | `COMPLETED` | Return 202 with `queued:false` if queue throws; review is safely stored in pending state — do NOT return 201 |
| 1.4 Add contextual review eligibility UI (`ReviewForm.tsx`) | `COMPLETED` | Five states: not logged in / is owner / no contact / eligible / delayed |

---

## Phase 2 — Schema Cleanup & Foundation

| Subtask | Status | Notes |
|---------|--------|-------|
| 2.1 Update `roomTypeEnum` for BHK + occupancy types | `COMPLETED` | New values: 1bhk, 2bhk, 3bhk, 4bhk, single, double, multiple |
| 2.2 Add `deposit`, `area`, `availableFrom`, `furnishing` to listings schema | `COMPLETED` | New columns for richer listing cards |
| 2.3 Add `nearbyLocalityId` relation to localities table | `COMPLETED` | localityNeighbors join table added |
| 2.4 Run fresh DB migration (DB is being reset) | `COMPLETED` | Drop all, push new schema, seeded 2 cities + localities + admin |
| 2.5 Migrate all forms to `react-hook-form` + Zod | `COMPLETED` | ReviewForm, ListingForm, ContentEditor migrated; schemas in lib/schemas/ |
| 2.6 Fix URL/state sync in search (empty state + URL reset) | `COMPLETED` | SearchBar now navigates to /listings on empty query |
| 2.7 Standardize UI primitives (Button, Input, Badge, Chip) | `COMPLETED` | Chip component created with selectable + removable variants |

---

## Phase 3 — Authentication Redesign

| Subtask | Status | Notes |
|---------|--------|-------|
| 3.1 Update `users` schema (passwordHash, emailVerified, isPosterVerified, googleId) | `COMPLETED` | Added passwordHash, googleId, emailVerified, isPosterVerified columns |
| 3.2 Backend: `POST /api/auth/register` (email + password) | `COMPLETED` | bcrypt hash, create user, return JWT |
| 3.3 Backend: `POST /api/auth/login` (email + password) | `COMPLETED` | Compare hash, return JWT |
| 3.4 Backend: Google OAuth flow (`/api/auth/google` + callback) | `COMPLETED` | passport-google-oauth20, upsert user |
| 3.5 Backend: OTP send/verify now sets `emailVerified = true` | `COMPLETED` | OTP gated behind requireAuth, sets emailVerified |
| 3.6 Backend: `PATCH /api/auth/phone` sets phone; auto-sets `isPosterVerified` | `COMPLETED` | isPosterVerified = emailVerified && phone != null |
| 3.7 Backend: Guard listing publish behind `isPosterVerified` | `COMPLETED` | PATCH /:id/status endpoint added; create defaults to draft |
| 3.8 Frontend: `/auth/login` page (email/password + Google OAuth button) | `COMPLETED` | New login page at /auth/login |
| 3.9 Frontend: `/auth/register` page (name, email, password) | `COMPLETED` | New register page at /auth/register |
| 3.10 Frontend: Poster verification flow modal/page | `COMPLETED` | PosterVerificationModal: 2-step OTP + phone |
| 3.11 Frontend: Update Navbar auth state display | `COMPLETED` | Verified badge, Get Verified link, login/register links |
| 3.12 Frontend: Draft listing flow — create draft before verifying | `COMPLETED` | Save draft + publish gate with PosterVerificationModal |

---

## Phase 4 — Guided Search Widget

| Subtask | Status | Notes |
|---------|--------|-------|
| 4.1 Backend: `GET /api/places/nearby?localityId=` endpoint | `NOT_STARTED` | Returns nearby localities by shared city or explicit relation |
| 4.2 Backend: Update search to accept multiple locality IDs | `NOT_STARTED` | `localityIds[]` param in `search.ts` |
| 4.3 Backend: Add BHK room type to search filters | `NOT_STARTED` | `roomType` filter now includes 1bhk, 2bhk, etc. |
| 4.4 Frontend: `GuidedSearchWidget` component | `NOT_STARTED` | Replaces `SearchBar`; lives in `components/search/` |
| 4.5 Frontend: Intent tabs (Buy / Rent) in widget | `NOT_STARTED` | Controls which sub-filters appear |
| 4.6 Frontend: City selector dropdown | `NOT_STARTED` | Loads from `/api/places/cities` |
| 4.7 Frontend: Locality typeahead with chip display (max 3) | `NOT_STARTED` | Client-side filter from loaded city localities |
| 4.8 Frontend: Nearby locality chips (after first locality selected) | `NOT_STARTED` | Fetches from nearby endpoint |
| 4.9 Frontend: Contextual sub-filter chips (BHK for Buy/Apt, Occupancy for PG/Hostel) | `NOT_STARTED` | Rules: Buy → no PG/Hostel; Apt/Flat → BHK chips |
| 4.10 Frontend: Widget submits all state to URL, navigates to listings | `NOT_STARTED` | Multi-locality, intent, subfilter all in URL |
| 4.11 Frontend: Integrate widget into homepage `page.tsx` | `NOT_STARTED` | Replace old `<SearchBar />` |
| 4.12 Backend: Normalize Buy intent to Apartment/Flat only in search API | `NOT_STARTED` | Product rule, not just UI — normalize invalid propertyType values server-side in `searchFilters.ts` |

---

## Phase 5 — Filter Panel Redesign

| Subtask | Status | Notes |
|---------|--------|-------|
| 5.1 Frontend: New `ListingFilters` component (replaces old sidebar) | `NOT_STARTED` | Chip-style controls |
| 5.2a Frontend: BHK filter chips (Apartment/Flat contexts only) | `NOT_STARTED` | 1BHK–4BHK; hidden when propertyType is pg/hostel |
| 5.2b Frontend: Occupancy filter chips (PG/Hostel contexts only) | `NOT_STARTED` | Single/Double/Multiple; replaces BHK chips; URL param `roomType` same key |
| 5.3 Frontend: Price/rent range slider or dual input | `NOT_STARTED` | Min/max price URL params |
| 5.4 Frontend: Availability filter | `NOT_STARTED` | Date or immediate/upcoming chips |
| 5.5 Frontend: Preferred tenants filter (students, working, family, any) | `NOT_STARTED` | Chip multi-select |
| 5.6 Frontend: Furnishing filter (furnished, semi, unfurnished) | `NOT_STARTED` | Chip multi-select |
| 5.7 Frontend: Property type filter (PG, Hostel, Apartment, Flat) | `NOT_STARTED` | Chip multi-select; Buy intent must lock to Apartment/Flat only |
| 5.8 Frontend: Gender preference filter | `NOT_STARTED` | Male/Female/Any chips |
| 5.9 Frontend: Food included toggle | `NOT_STARTED` | Boolean filter chip |
| 5.10 Frontend: Active filter count badge in filter header | `NOT_STARTED` | Count non-default active filters |
| 5.11 Frontend: Reset all filters action (clears URL params) | `NOT_STARTED` | Resets URL to clean state |
| 5.12 Frontend: All filter state is URL-driven (useSearchParams) | `NOT_STARTED` | No local state for filter values |
| 5.13 Verify backend Buy normalization from Phase 4 | `NOT_STARTED` | Confirm Phase 4.12 covers buy-only apartment/flat rule; do not re-implement |
| 5.14 Frontend: URL canonicalization on listings page | `NOT_STARTED` | Strip invalid param combos (buy+pg, bhk+pg, etc.) on page load before API call |

---

## Phase 6 — Listing Card Redesign

| Subtask | Status | Notes |
|---------|--------|-------|
| 6.1 Frontend: New `ListingCard` horizontal layout (desktop) | `NOT_STARTED` | Image left, details right |
| 6.2 Frontend: Mobile stacked layout for `ListingCard` | `NOT_STARTED` | Responsive via Tailwind |
| 6.3 Frontend: Display deposit, area, furnishing, availability in card | `NOT_STARTED` | New schema fields from Phase 2 |
| 6.4 Frontend: "Explore nearby" link on card | `NOT_STARTED` | Links to locality page |
| 6.5 Frontend: Nearest landmark / distance info on card | `NOT_STARTED` | Pulls from listing `landmark` field |
| 6.6 Frontend: Primary CTA (contact owner) inline on card | `NOT_STARTED` | Uses `ContactButton` component |
| 6.7 Frontend: Favorite action inline on card | `NOT_STARTED` | Uses `FavoriteButton` component |

---

## Phase 7 — EMI Calculator Visibility

| Subtask | Status | Notes |
|---------|--------|-------|
| 7.1 Frontend: Show `EMICalculator` only on buy listing detail pages | `NOT_STARTED` | Check `listing.intent === 'buy'` |
| 7.2 Frontend: Remove `EMICalculator` from `/[city]/[locality]/page.tsx` | `NOT_STARTED` | Locality pages are rent-focused |

---

## Completion Log

| Date | Phase | Subtask | Agent | Notes |
|------|-------|---------|-------|-------|
| 2026-04-10 | 1 | 1.1–1.4 | claude-sonnet-4-6 | All Phase 1 subtasks complete |
| 2026-04-10 | 2 | 2.1–2.7 | claude-sonnet-4-6 | All Phase 2 subtasks complete |
| 2026-04-10 | 3 | 3.1–3.12 | claude-sonnet-4-6 | All Phase 3 subtasks complete |
