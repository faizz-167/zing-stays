# Phase 2 — Schema Cleanup & Foundation

## Status: `NOT_STARTED`

## Objective

Reset the database schema to support new features, standardize all forms with `react-hook-form`, fix URL/state sync for search, and build reusable UI primitives (Chip component). This is the infrastructure phase — everything in Phases 3–7 builds on this.

## Dependencies

- Phase 1 must be COMPLETED first (security fixes must not be lost when schema is reset)

---

## Subtasks

### 2.1 — Update `roomTypeEnum` for BHK + occupancy types

**File:** `server/src/db/schema.ts`

**Problem:** Current enum is `['single', 'double', 'shared']` — inadequate. Apartments need BHK types; PG/Hostel need occupancy types.

**New enum values:**
```ts
export const roomTypeEnum = pgEnum('room_type', [
  // For PG / Hostel
  'single', 'double', 'multiple',
  // For Apartment / Flat
  '1bhk', '2bhk', '3bhk', '4bhk',
]);
```

**Rule for enforcement (in listing form and backend validation):**
- If `propertyType` is `pg` or `hostel` → only allow `single | double | multiple`
- If `propertyType` is `apartment` or `flat` → only allow `1bhk | 2bhk | 3bhk | 4bhk`

This cross-field validation lives in the Zod schema for listing creation/edit (both frontend and backend).

---

### 2.2 — Add `deposit`, `area`, `availableFrom`, `furnishing` to listings schema

**File:** `server/src/db/schema.ts` — `listings` table

Add these columns:

```ts
deposit: integer('deposit'),                       // optional, in rupees
areaSqft: integer('area_sqft'),                    // optional, sq ft
availableFrom: timestamp('available_from'),         // optional, move-in date
furnishing: furnishingEnum('furnishing'),           // see enum below
preferredTenants: preferredTenantsEnum('preferred_tenants').default('any'),
```

New enums:
```ts
export const furnishingEnum = pgEnum('furnishing', ['furnished', 'semi', 'unfurnished']);
export const preferredTenantsEnum = pgEnum('preferred_tenants', ['students', 'working', 'family', 'any']);
```

The existing `genderPref` enum stays as-is.

---

### 2.3 — Add nearby localities relation

**File:** `server/src/db/schema.ts` — `localities` table

Add a join table:
```ts
export const localityNeighbors = pgTable('locality_neighbors', {
  localityId: integer('locality_id').references(() => localities.id, { onDelete: 'cascade' }).notNull(),
  neighborId: integer('neighbor_id').references(() => localities.id, { onDelete: 'cascade' }).notNull(),
}, (t) => [
  uniqueIndex('locality_neighbors_uniq').on(t.localityId, t.neighborId),
]);
```

Initially, nearby localities can be seeded based on same-city localities. The backend `/api/places/nearby` endpoint (Phase 4) will use this table.

---

### 2.4 — Run fresh DB migration

**Since the database is being reset** (global constraint in improvements.md), run:
```bash
cd server
npx drizzle-kit drop   # or manually drop all tables
npx drizzle-kit push   # push new schema
```

Seed minimum data:
- At least 2 cities (e.g. Bangalore, Hyderabad)
- Several localities per city
- One admin user

---

### 2.5 — Migrate all forms to `react-hook-form` + Zod

**Files to migrate:**
- `client/components/listings/ReviewForm.tsx` (also part of Phase 1.4)
- `client/components/forms/ListingForm.tsx`
- `client/app/auth/page.tsx` (login / register — these will be rebuilt in Phase 3)
- `client/app/dashboard/listings/new/page.tsx` and `[id]/edit/page.tsx`
- Profile form (wherever it exists in dashboard)
- `client/components/admin/ContentEditor.tsx`

**Pattern to follow:**
```ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ ... });
type FormValues = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
  resolver: zodResolver(schema),
});
```

All Zod schemas for forms should live in `client/lib/schemas/` — one file per domain (already partially exists with `auth.ts` and `listing.ts`).

---

### 2.6 — Fix URL/state sync in search

**File:** `client/components/search/SearchBar.tsx` (will be replaced by GuidedSearchWidget in Phase 4, but fix it now)
**File:** `client/app/listings/page.tsx`

**Problems to fix:**
1. If a user types a query and then clears it, submitting should navigate to `/listings` (no `?q=`) — currently `if (!query.trim()) return` does nothing.
2. When the listing page mounts with no `?q=` param, it should show all listings, not remain in a previous searched state.

**Fix for SearchBar:**
```ts
const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  const trimmed = query.trim();
  if (trimmed) {
    router.push(`/listings?q=${encodeURIComponent(trimmed)}`);
  } else {
    router.push('/listings');  // clear state by navigating without query
  }
};
```

**Fix for listings page:** Ensure `useSearchParams()` drives all state. If `q` param is absent, treat as no-filter search. Do not persist previous search state in component state.

---

### 2.7 — Standardize UI primitives (Chip component)

**New file:** `client/components/ui/Chip.tsx`

This is needed by Phases 4 and 5 (guided search chips, filter chips).

```tsx
interface ChipProps {
  label: string;
  active?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  disabled?: boolean;
}
```

Two variants:
- **Selectable chip** — toggles active state on click, used in filter panels and sub-filter rows
- **Removable chip** — shows an `×` button, used in multi-locality selection

Also ensure `Button`, `Input`, and `Card` in `components/ui/` are used consistently across all forms — replace any inline `<button>` or `<input>` elements in existing components with these primitives.

---

## Step-by-Step Execution Plan

1. Mark Phase 2 as `IN_PROGRESS` in `status.md`.
2. Update `server/src/db/schema.ts` with all schema changes (2.1, 2.2, 2.3 together in one pass).
3. Run DB migration (2.4).
4. Create `Chip.tsx` UI primitive (2.7).
5. Migrate `ReviewForm.tsx` to react-hook-form (2.5 — pairs with Phase 1.4 work).
6. Migrate `ListingForm.tsx` to react-hook-form.
7. Migrate remaining forms (profile, content editor).
8. Fix `SearchBar` URL sync (2.6).
9. Update `status.md` marking all subtasks COMPLETED.
10. Mark Phase 2 COMPLETED.

---

## Validation Criteria

- [ ] `roomTypeEnum` includes both BHK and occupancy values
- [ ] `listings` table has `deposit`, `areaSqft`, `availableFrom`, `furnishing`, `preferredTenants` columns
- [ ] `localityNeighbors` join table exists in schema
- [ ] DB migration runs cleanly from a clean state
- [ ] `Chip` component renders in both selectable and removable modes
- [ ] `ReviewForm`, `ListingForm`, and at least 2 other forms use `react-hook-form` with Zod resolver
- [ ] Clearing the search bar and submitting navigates to `/listings` without `?q=`
- [ ] Listing page shows all results when no `?q=` param is present
