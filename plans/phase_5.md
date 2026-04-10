# Phase 5 — Filter Panel Redesign

## Status: `NOT_STARTED`

## Objective

Replace the current `ListingFilters` sidebar component with a redesigned, chip-based filter panel. All filter state must be URL-driven. The panel must show an active filter count and have a reset action that clears the URL.

## Dependencies

- Phase 2 COMPLETED (`Chip` component, new schema columns like `furnishing`, `preferredTenants`)
- Phase 4 COMPLETED (URL params from guided search must not conflict with filter panel params)

---

## Subtasks

### 5.1 — New `ListingFilters` component

**File:** `client/components/listings/ListingFilters.tsx` (rewrite existing)

The component reads all filter values from `useSearchParams()` and updates the URL on every change (no intermediate local state for filter values — the URL IS the state).

Structure:
```
FilterPanel
  FilterHeader (title + active count badge + Reset button)
  BHKFilter (conditional)
  PriceRangeFilter
  AvailabilityFilter
  PreferredTenantsFilter
  FurnishingFilter
  PropertyTypeFilter
  GenderPreferenceFilter
  FoodIncludedFilter
```

Each sub-section can be a small component or a collapsible section. Keep file under 400 lines — extract sub-filters to separate files if needed.

---

### 5.2a — BHK filter chips

**File:** `client/components/listings/filters/BhkFilter.tsx` (new)

- Chips: `1BHK`, `2BHK`, `3BHK`, `4BHK`
- Multi-selectable (any combination allowed)
- URL param: `roomType` (array) — same key shared with occupancy filter
- **Shown when:**
  - `intent === 'buy'` (always, since buy is apartment/flat only), OR
  - `intent === 'rent'` AND `propertyType` includes `apartment` or `flat` (and NOT exclusively `pg`/`hostel`)
- **Hidden when** `propertyType` is exclusively `pg` or `hostel`

---

### 5.2b — Occupancy filter chips (PG/Hostel contexts)

**File:** `client/components/listings/filters/OccupancyFilter.tsx` (new)

This is a **separate component** with its own dedicated subtask, not a variant of BhkFilter.

- Chips: `Single`, `Double`, `Multiple`
- Multi-selectable
- URL param: `roomType` (same array key as BHK — both map to `roomTypeEnum`)
- **Shown when:** `propertyType` is exclusively `pg` or `hostel` (and `intent === 'rent'`, since buy never shows PG/Hostel)
- **Hidden when:** `intent === 'buy'` or `propertyType` includes apartment/flat

**Mutual exclusivity rule (client-side):**
Only one of `BhkFilter` or `OccupancyFilter` is mounted at a time — never both simultaneously.

```tsx
// In ListingFilters.tsx render:
const showBhk = intent === 'buy' || propertyTypes.some(t => ['apartment','flat'].includes(t));
const showOccupancy = intent === 'rent' && propertyTypes.length > 0
  && propertyTypes.every(t => ['pg','hostel'].includes(t));

{showBhk && <BhkFilter />}
{showOccupancy && <OccupancyFilter />}
```

**When switching property type clears roomType:**
If a user switches from PG/Hostel to Apartment (or vice versa), the active `roomType` values in the URL are no longer valid. Clear `roomType` from the URL when the mounted filter component changes. This prevents e.g. `roomType=single` persisting when the user switches to apartments.

---

### 5.3 — Price/Rent range filter

**File:** `client/components/listings/filters/PriceRangeFilter.tsx` (new)

UI: Two number inputs — Min price and Max price. Or a dual-thumb range slider.

URL params: `minPrice`, `maxPrice` (integers, in rupees)

On change, debounce by ~400ms before pushing to URL (avoid excessive navigation on keypress).

---

### 5.4 — Availability filter

**File:** `client/components/listings/filters/AvailabilityFilter.tsx` (new)

Chips: `Available Now`, `Within 30 days`, `Any`

URL param: `availability` — values: `now | soon | any`

Backend in `search.ts` must filter by `availableFrom`:
- `now` → `availableFrom IS NULL OR availableFrom <= NOW()`
- `soon` → `availableFrom <= NOW() + 30 days`
- `any` → no filter

---

### 5.5 — Preferred tenants filter

**File:** `client/components/listings/filters/PreferredTenantsFilter.tsx` (new)

Chips: `Students`, `Working Professionals`, `Family`, `Any`

URL param: `preferredTenants` (array, multi-select)

Maps to `preferredTenantsEnum` values: `students | working | family | any`

---

### 5.6 — Furnishing filter

**File:** `client/components/listings/filters/FurnishingFilter.tsx` (new)

Chips: `Furnished`, `Semi-Furnished`, `Unfurnished`

URL param: `furnishing` (array, multi-select)

Maps to `furnishingEnum` values: `furnished | semi | unfurnished`

---

### 5.7 — Property type filter

**File:** `client/components/listings/filters/PropertyTypeFilter.tsx` (new)

URL param: `propertyType` (array, multi-select)

**When `intent === 'rent'`:** Show all four chips — `PG`, `Hostel`, `Apartment`, `Flat`

**When `intent === 'buy'`:** Show only `Apartment` and `Flat`. Do not render `PG` and `Hostel` chips at all. If the URL somehow contains `propertyType=pg`, the canonicalization layer (Phase 4, subtask 4.13) strips it — this component just does not render those options.

When `propertyType` changes in the filter panel and the new selection is incompatible with the active `roomType` values, clear `roomType` from the URL. (e.g., user selects `PG` when `roomType=2bhk` is active → clear `roomType`.)

---

### 5.8 — Gender preference filter

**File:** `client/components/listings/filters/GenderFilter.tsx` (new)

Chips: `Male`, `Female`, `Any`

URL param: `genderPref` (single-select)

Maps to `genderPrefEnum` values: `male | female | any`

---

### 5.9 — Food included toggle

**File:** Inline in `ListingFilters.tsx` or small sub-component

Chip or toggle: `Food Included`

URL param: `foodIncluded=true` (boolean, omit from URL when false)

---

### 5.10 — Active filter count badge

Inside `FilterHeader`:

Count how many filters are non-default (non-empty, non-"any"):
- `roomType` — count if array is non-empty
- `minPrice` / `maxPrice` — count as 1 if either is set
- `availability` — count if not `any`
- `preferredTenants` — count if non-empty and not just `['any']`
- `furnishing` — count if non-empty
- `propertyType` — count if non-empty
- `genderPref` — count if not `any`
- `foodIncluded` — count if `true`

Display count as a small badge: `Filters (3)`.

---

### 5.11 — Reset all filters

Inside `FilterHeader`, a "Reset" or "Clear all" button:

On click:
```ts
const params = new URLSearchParams(searchParams);
['roomType', 'minPrice', 'maxPrice', 'availability', 'preferredTenants',
 'furnishing', 'propertyType', 'genderPref', 'foodIncluded'].forEach(k => params.delete(k));
router.replace(`/listings?${params.toString()}`);
```

Preserve `intent`, `q`, `localityId`, and other non-filter params.

---

### 5.12 — All filter state is URL-driven

**Principle:** No filter value lives in component state. Every filter reads from `useSearchParams()` and writes by calling `router.replace()` or `router.push()`.

This means:
- Browser back/forward navigates between filter states
- Sharing a URL gives the same filter view
- Refreshing the page preserves filters

Update `client/app/listings/page.tsx` to pass the URL params to the backend search API correctly, including all new filter params.

Also update `server/src/routes/search.ts` and `searchFilters.ts` to handle:
- `availability` → date range filtering on `availableFrom`
- `preferredTenants[]` → filter on `preferredTenants` column
- `furnishing[]` → filter on `furnishing` column
- `genderPref` → already exists; verify it still works

---

### 5.13 — Verify backend Buy normalization from Phase 4

**Files:** `server/src/lib/searchFilters.ts`, `server/src/routes/search.ts`

This phase does **not** own the backend implementation of the Buy-only apartment/flat rule. That ownership belongs to Phase 4, subtask 4.12.

What Phase 5 must do:
1. Confirm the Phase 4 backend normalization is still active after filter-panel changes
2. Confirm the filter panel sends params compatible with that normalization
3. Reuse the existing behavior; do **not** re-implement the server rule in this phase

Verification target:
- A request such as `intent=buy&propertyType=pg` is normalized server-side to apartment/flat behavior before the DB query runs

If verification fails, Phase 5 should mark itself `BLOCKED` on Phase 4 rather than duplicating the backend logic.

---

### 5.14 — Frontend: URL canonicalization on listings page

**File:** `client/app/listings/page.tsx`

The listings page must normalize URL params before making any API call, to handle:
- Shared/bookmarked URLs with invalid param combinations
- Browser history states from before an intent switch

**Rules (apply in order, silently — use `router.replace()` to clean the URL):**

| Invalid state | Fix |
|--------------|-----|
| `intent=buy` + `propertyType` includes `pg`/`hostel` | Strip `pg`/`hostel`; if empty, set to `['apartment','flat']` |
| `intent=buy` + `roomType` includes `single`/`double`/`multiple` | Strip those occupancy values |
| `propertyType` is exclusively `pg`/`hostel` + `roomType` includes BHK values | Strip BHK values |
| `propertyType` is exclusively `apartment`/`flat` + `roomType` includes occupancy values | Strip occupancy values |

**When to call `router.replace()`:** Only when something was actually stripped. Do not replace the URL if params are already valid — that creates infinite replace loops.

**Edge case — all localities removed:**
If a user had localities `[A, B, C]` and removes all of them, the URL has no `localityId`. The listings page must treat this as "search all localities" — not freeze in a broken state. Show all listings for the selected city (or all listings if no city either).

---

## Step-by-Step Execution Plan

1. Mark Phase 5 as `IN_PROGRESS` in `status.md`.
2. Verify backend Buy normalization from Phase 4 is still intact (5.13). Do not duplicate the implementation here.
3. Update `server/src/lib/searchFilters.ts` for all new filter params (availability, preferredTenants, furnishing).
4. Build `ListingFilters.tsx` shell with `FilterHeader` (active count + reset).
5. Build `BhkFilter.tsx` (5.2a) and `OccupancyFilter.tsx` (5.2b) as separate components with mutual exclusivity logic.
6. Build remaining sub-filter components (5.3–5.9).
7. Wire up URL reading/writing for each filter. Ensure `propertyType` changes clear incompatible `roomType` values.
8. Implement URL canonicalization in `listings/page.tsx` (5.14).
9. Test that resetting clears all filter params while keeping `intent`, `q`, `localityId`.
10. Update `client/app/listings/page.tsx` to pass all filter params to the API.
11. Update `status.md`.

---

## Validation Criteria

- [ ] Filter panel shows active filter count correctly
- [ ] Reset button clears all filter params but keeps `intent`, `q`, `localityId`
- [ ] BHK filter (5.2a) shown only when context is apartment/flat or buy intent
- [ ] Occupancy filter (5.2b) shown only when context is exclusively PG/Hostel
- [ ] BHK and Occupancy filters are never both visible at the same time
- [ ] Switching from PG to Apartment clears `roomType` from URL (and vice versa)
- [ ] Price range filter debounces URL updates
- [ ] All filter changes update the URL (no local state for filter values)
- [ ] Refreshing the page preserves all active filters
- [ ] Backend correctly filters by all new params
- [ ] **Verification:** Phase 4 backend normalization still ensures `intent=buy&propertyType=pg` resolves to apartment/flat behavior (or empty)
- [ ] **URL canon:** `/listings?intent=buy&propertyType=pg&roomType=single` auto-corrects URL and API call
- [ ] **URL canon:** Removing all localities shows all-listings view, not a broken state
- [ ] Mobile layout usable (filters accessible — consider a drawer/toggle on mobile)
