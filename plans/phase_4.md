# Phase 4 — Guided Search Widget

## Status: `NOT_STARTED`

## Objective

Replace the simple `SearchBar` component on the homepage with a rich, guided search widget that walks users through intent → city → locality → contextual sub-filters, submitting all state as URL parameters to the listings page.

## Dependencies

- Phase 2 COMPLETED (`Chip` component must exist, URL/state sync must be fixed, `roomTypeEnum` must include BHK values)
- Phase 3 COMPLETED (auth state may influence widget display, but functionally the widget works without auth)

---

## Subtasks

### 4.1 — Backend: `GET /api/places/nearby`

**File:** `server/src/routes/places.ts`

New endpoint: `GET /api/places/nearby?localityId=<id>`

Logic:
1. Look up the given `localityId` in `localityNeighbors` table (added in Phase 2.3)
2. Return the neighboring localities with `id`, `name`, `slug`
3. Fallback if no explicit neighbors exist: return other localities in the same city (ordered alphabetically), excluding the input locality

Response shape:
```json
{
  "nearby": [
    { "id": 12, "name": "Koramangala", "slug": "koramangala" },
    { "id": 15, "name": "Indiranagar", "slug": "indiranagar" }
  ]
}
```

---

### 4.2 — Backend: Update search to accept multiple locality IDs

**File:** `server/src/routes/search.ts` and `server/src/lib/searchFilters.ts`

Currently search accepts a single `locality` slug. Update to accept:
- `localityIds[]` — array of locality IDs (integer)
- OR `locality` — single slug (backward compat during transition)

In the Drizzle query, use `inArray(listings.localityId, localityIds)` when multiple IDs are provided.

---

### 4.3 — Backend: BHK/occupancy room type in search filters

**File:** `server/src/lib/searchFilters.ts`

The `roomType` filter already exists. No backend change needed beyond accepting the new enum values (`1bhk`, `2bhk`, etc.) — which is automatic once the schema is updated in Phase 2.1.

However, confirm that the search filter for `roomType` passes the values through without sanitization that strips the new values. If there is a whitelist, update it.

---

### 4.12 — Backend: Normalize Buy = apartment/flat only (product rule)

**File:** `server/src/lib/searchFilters.ts` and/or `server/src/routes/search.ts`

This is a **product-level rule**, not a UI preference. The backend must enforce it regardless of what the frontend sends.

**Rule:** If `intent === 'buy'`, automatically restrict `propertyType` to `['apartment', 'flat']`. Any `propertyType` values of `pg` or `hostel` in the request must be silently overridden (not rejected with 400 — just normalized away).

**Implementation:**
```ts
// In buildSearchFilters or the search route handler:
if (params.intent === 'buy') {
  // Force only apartment/flat — ignore any pg/hostel values from URL
  const allowedForBuy = ['apartment', 'flat'];
  params.propertyType = params.propertyType
    ? params.propertyType.filter(t => allowedForBuy.includes(t))
    : allowedForBuy;  // default to both if none specified
}
```

This means a URL like `/listings?intent=buy&propertyType=pg` will return only apartment/flat results — the `pg` value is stripped before the DB query runs. The frontend never needs to trust that this rule is enforced — the backend is the authority.

---

### 4.13 — Frontend + Backend: URL canonicalization on listings page

**File:** `client/app/listings/page.tsx` (client-side canonicalization before API call)

The listings page receives URL params from two sources: the GuidedSearchWidget and direct URL sharing/bookmarking. Some combinations are invalid. The page must normalize them before making the API call — and optionally `router.replace()` to clean the visible URL.

**Canonicalization rules (apply in this order):**

| Condition | Action |
|-----------|--------|
| `intent=buy` + `propertyType` includes `pg` or `hostel` | Strip `pg`/`hostel` from `propertyType`; if empty, default to `['apartment','flat']` |
| `intent=buy` + `roomType` includes `single`, `double`, or `multiple` | Strip those occupancy values from `roomType` |
| `intent=rent` + `propertyType` includes only PG/Hostel + `roomType` includes BHK values | Strip BHK values from `roomType` |
| `intent` switches and selected `roomType` values are incompatible | Clear `roomType` |
| `localityId` references a locality not in the selected city | Silently drop the invalid locality ID |

**When to replace URL vs. just silently normalize for API:**
- For the API call: always normalize before sending.
- For the URL: call `router.replace()` with the cleaned params only if something was actually stripped (avoid unnecessary history entries).

**Switching intent on the listings page:**
If a filter panel provides an intent toggle (Buy ↔ Rent), switching intent must:
1. Clear `roomType` values that are no longer valid
2. Restrict/unrestrict `propertyType` accordingly
3. Do this client-side immediately — do not wait for a new page navigation

---

### 4.4 — Frontend: `GuidedSearchWidget` component

**New file:** `client/components/search/GuidedSearchWidget.tsx`

This is the main container component. It manages:
- Selected intent (`buy` | `rent`)
- Selected city ID
- Selected locality IDs (array, max 3)
- Selected sub-filter values

It renders four rows:
- Row 1: Intent tabs
- Row 2: City + Locality inputs + Search button
- Row 3: Nearby locality chips (conditional)
- Row 4: Contextual sub-filter chips (conditional)

Use `react-hook-form` for the form layer. Local component state (not URL) for draft selection — URL is only written when the form is submitted.

---

### 4.5 — Frontend: Intent tabs (Buy / Rent)

Inside `GuidedSearchWidget`:

```tsx
<div className="flex gap-2">
  {['buy', 'rent'].map(tab => (
    <button
      key={tab}
      onClick={() => setIntent(tab)}
      className={intent === tab ? 'active-tab-styles' : 'inactive-tab-styles'}
    >
      {tab === 'buy' ? 'Buy' : 'Rent'}
    </button>
  ))}
</div>
```

When intent changes from `rent` to `buy`:
- Clear any PG/Hostel-specific sub-filters
- Reset locality selection if needed

---

### 4.6 — Frontend: City selector dropdown

Inside `GuidedSearchWidget`:

- Fetch cities from `GET /api/places/cities` on mount
- Render a `<select>` or custom dropdown
- When city changes: clear selected localities (they are city-specific)
- Pre-fetch localities for the selected city (stored in component state, used by typeahead in 4.7)

---

### 4.7 — Frontend: Locality typeahead with chip display

Inside `GuidedSearchWidget`:

Typeahead behavior:
- Input filters the city's pre-loaded locality list client-side (no extra API call)
- Show a dropdown of matching locality names while typing
- On select: add locality to the selected list (max 3), clear the input
- Display selected localities as removable `Chip` components (from Phase 2.7)
- Removing a chip removes the locality from the list

Rules:
- Max 3 localities at once
- Input is disabled when 3 are selected

---

### 4.8 — Frontend: Nearby locality chips

Inside `GuidedSearchWidget`:

After the first locality is selected:
1. Call `GET /api/places/nearby?localityId=<firstSelectedId>`
2. Display returned localities as selectable chips below the input row
3. Clicking a nearby chip adds it to the selected list (respects max 3 cap)
4. Already-selected localities appear as active/disabled chips

This row only appears after at least one locality is selected.

---

### 4.9 — Frontend: Contextual sub-filter chips

Inside `GuidedSearchWidget`:

Sub-filter chips appear in Row 4. What shows depends on `intent` and an optional property type pre-selection.

| Context | Sub-filters shown |
|---------|-------------------|
| `buy` (any type) | 1BHK, 2BHK, 3BHK, 4BHK |
| `rent` + Apartment/Flat | 1BHK, 2BHK, 3BHK, 4BHK |
| `rent` + PG/Hostel | Single, Double, Multiple |
| `buy` + PG/Hostel | Not shown (PG/Hostel not for buy) |

Chips are multi-selectable. Selected chips are passed as `roomType[]` in the URL.

Also include a property type pre-filter row (optional, can be in same row 4): PG | Hostel | Apartment | Flat — but only for `rent` intent.

---

### 4.10 — Frontend: Widget submits all state to URL

Inside `GuidedSearchWidget`, the Search button handler:

```ts
const handleSearch = () => {
  const params = new URLSearchParams();
  if (intent) params.set('intent', intent);
  selectedLocalityIds.forEach(id => params.append('localityId', String(id)));
  selectedRoomTypes.forEach(rt => params.append('roomType', rt));
  if (selectedPropertyType) params.set('propertyType', selectedPropertyType);
  router.push(`/listings?${params.toString()}`);
};
```

The listings page (`/listings/page.tsx`) must read these params via `useSearchParams()` and pass them to the search API.

---

### 4.11 — Frontend: Integrate widget into homepage

**File:** `client/app/page.tsx`

Replace `<SearchBar />` with `<GuidedSearchWidget />`.

The widget should be visually centered, with appropriate padding. On mobile it should stack its rows vertically without horizontal scroll.

---

## Step-by-Step Execution Plan

1. Mark Phase 4 as `IN_PROGRESS` in `status.md`.

2. Implement `GET /api/places/nearby` endpoint (4.1).
3. Update search route for multi-locality support (4.2).
4. Verify BHK/occupancy room types pass through search filters (4.3).
5. **Implement Buy=apartment/flat enforcement in `searchFilters.ts`** (4.12) — do this alongside 4.3, in the same file.
6. Build `GuidedSearchWidget` container with local state management (4.4).
7. Add intent tabs; switching Buy must clear PG/Hostel selections (4.5).
8. Add city selector (fetches cities on mount) (4.6).
9. Add locality typeahead with chip display (4.7).
10. Add nearby locality chips row (fetches on first locality select) (4.8).
11. Add contextual sub-filter chips row — BHK for Buy/Apt, Occupancy for PG/Hostel (4.9).
12. Wire up the Search button with URL submission (4.10).
13. **Implement URL canonicalization logic in `listings/page.tsx`** (4.13) — before the API call and router.replace on mismatch.
14. Replace `<SearchBar />` on homepage (4.11).
15. Update `status.md`.

---

## Validation Criteria

- [ ] `GET /api/places/nearby?localityId=X` returns related localities
- [ ] Search API accepts and filters by multiple `localityId` values
- [ ] Widget renders intent tabs; Buy hides PG/Hostel options
- [ ] City selector loads cities from API
- [ ] Locality typeahead filters client-side from loaded list
- [ ] Max 3 localities can be selected; removable chips shown
- [ ] Nearby chips appear after first locality is selected
- [ ] Sub-filter chips change based on intent and property type
- [ ] Search button navigates to `/listings?intent=...&localityId=...&roomType=...`
- [ ] Listings page correctly reads and applies new URL params
- [ ] Homepage shows `GuidedSearchWidget` instead of plain `SearchBar`
- [ ] Mobile layout is usable (no horizontal overflow)
- [ ] **Backend:** Search with `intent=buy&propertyType=pg` returns zero results or normalizes to apartment/flat — verified via direct API test
- [ ] **Backend:** BHK values (`1bhk`, `2bhk`) are never returned for `intent=buy&propertyType=pg` combinations
- [ ] **URL canonicalization:** Navigating to `/listings?intent=buy&propertyType=pg&roomType=single` strips `pg` and `single` and calls the API with correct normalized params
- [ ] **URL canonicalization:** Switching intent on the listings page clears incompatible `roomType` values from the URL
- [ ] **URL canonicalization:** Invalid `localityId` values (not belonging to selected city) are silently dropped
