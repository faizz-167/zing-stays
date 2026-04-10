# Phase 6 — Listing Card Redesign

## Status: `NOT_STARTED`

## Objective

Redesign `ListingCard` to be information-dense and scannable. Users should be able to make basic decisions without opening the listing detail page. Desktop uses a horizontal layout (image left, details right). Mobile stacks vertically.

## Dependencies

- Phase 2 COMPLETED (new schema columns: `deposit`, `areaSqft`, `availableFrom`, `furnishing`, `preferredTenants`)
- Phase 5 COMPLETED (listings page architecture is stable before redesigning the card)

---

## Subtasks

### 6.1 — New `ListingCard` horizontal layout (desktop)

**File:** `client/components/listings/ListingCard.tsx` (rewrite)

Desktop layout (horizontal):
```
┌────────────────┬────────────────────────────────────────────┐
│                │  Title                          [♡]        │
│  Image         │  Locality, City   [Explore nearby →]       │
│  (fixed size)  │  ₹12,000/mo  ·  Deposit: ₹25,000          │
│                │  2BHK · Semi-Furnished · Apartment         │
│                │  Students · Any Gender · 450 sq ft         │
│                │  Available: Immediately                     │
│                │  Landmark: Near Metro Station              │
│                │                  [Contact Owner]           │
└────────────────┴────────────────────────────────────────────┘
```

Use Tailwind:
- `flex flex-col md:flex-row` for the card
- Image: `w-full md:w-48 lg:w-64 shrink-0 object-cover rounded-l-xl`
- Details: `flex-1 p-4`

---

### 6.2 — Mobile stacked layout

The same component renders stacked on mobile by default (flex-col). The image appears on top, full width. Details below.

No separate component — just responsive Tailwind classes. Test at 375px width.

---

### 6.3 — Display new schema fields in card

**Fields to show:**

| Field | Source | Display |
|-------|--------|---------|
| Deposit | `listing.deposit` | "Deposit: ₹X" (omit if null) |
| Area | `listing.areaSqft` | "X sq ft" (omit if null) |
| Furnishing | `listing.furnishing` | "Furnished" / "Semi" / "Unfurnished" |
| Availability | `listing.availableFrom` | "Available: Now" or formatted date |
| Preferred Tenants | `listing.preferredTenants` | "For Students" (omit if `any`) |
| Room Type | `listing.roomType` | "2BHK" / "Single" / "Double" |
| Property Type | `listing.propertyType` | "Apartment" / "PG" |
| Gender Pref | `listing.genderPref` | "Male only" / "Female only" (omit if `any`) |
| Food | `listing.foodIncluded` | "Food included" badge (omit if false) |

Show these as small inline tags or text rows. Do not show ALL at once — prioritize the most decision-critical ones. Suggested priority: price → deposit → room type → furnishing → area → availability → gender → tenants → food.

Ensure the backend search/listing response includes these new fields. Check `server/src/routes/listings.ts` GET response.

---

### 6.4 — "Explore nearby" link on card

Below the locality/city line:

```tsx
<Link href={`/${listing.citySlug}/${listing.localitySlug}`} className="text-xs text-blue-600 hover:underline">
  Explore nearby →
</Link>
```

The listing API response must include `citySlug` and `localitySlug`. Verify or add to the SELECT in the listings query.

---

### 6.5 — Landmark / distance info

If `listing.landmark` is not null, show it as a subtle line:
```tsx
{listing.landmark && (
  <p className="text-xs text-gray-500">Near {listing.landmark}</p>
)}
```

No geocoding or distance calculation — just show the text as provided by the owner.

---

### 6.6 — Primary CTA (Contact Owner) inline on card

Use the existing `ContactButton` component. It should appear at the bottom right of the details section.

The `ContactButton` must know the listing's `ownerId` and the current `userId` (from auth context) so it can refuse to render for the owner (Phase 1.2 frontend complement).

If user is not logged in: button says "Sign in to Contact" and links to `/auth/login`.
If user is the owner: button is hidden or shows "Your listing".
If user is logged in and not owner: shows "Contact Owner" → triggers reveal flow.

---

### 6.7 — Favorite action inline on card

Use the existing `FavoriteButton` component. It should appear in the top-right corner of the card (overlaid on image, or beside the title).

If user is not logged in: clicking favorite prompts login.

---

## Step-by-Step Execution Plan

1. Mark Phase 6 as `IN_PROGRESS` in `status.md`.
2. Verify the listings API response includes all new fields (`deposit`, `areaSqft`, `availableFrom`, `furnishing`, `preferredTenants`, `citySlug`, `localitySlug`). Update the SELECT query if needed.
3. Update `client/lib/types.ts` `Listing` type to include new fields.
4. Rewrite `ListingCard.tsx` with horizontal desktop layout and new field display.
5. Verify `ContactButton` handles owner self-contact prevention (links with Phase 1.2).
6. Verify `FavoriteButton` works inline on the card.
7. Check mobile layout at 375px and 768px breakpoints.
8. Update `status.md`.

---

## Validation Criteria

- [ ] Desktop shows horizontal card layout (image left, details right)
- [ ] Mobile shows stacked layout (no horizontal overflow)
- [ ] All new schema fields display when non-null; omitted gracefully when null
- [ ] "Explore nearby" link navigates to the correct locality page
- [ ] Landmark text shown when provided
- [ ] Contact Owner button hidden when viewer is the listing owner
- [ ] Favorite button works inline on the card
- [ ] Card renders correctly in the listings grid / list view
- [ ] No TypeScript type errors from missing or mismatched fields
