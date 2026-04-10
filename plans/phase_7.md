# Phase 7 — EMI Calculator Visibility

## Status: `NOT_STARTED`

## Objective

The EMI calculator is only relevant for buy listings. Remove it from rent-focused contexts: the locality page and any rent listing detail pages. Show it only when `listing.intent === 'buy'`.

## Dependencies

- Phase 6 COMPLETED (listing card and detail page structure is stable)
- This phase is small and isolated — can be worked in parallel with Phase 6 if needed

---

## Subtasks

### 7.1 — Show `EMICalculator` only on buy listing detail pages

**File:** `client/app/listings/[id]/page.tsx`

Find where `<EMICalculator />` is rendered. Wrap it in a conditional:

```tsx
{listing.intent === 'buy' && (
  <EMICalculator price={listing.price} />
)}
```

If the listing is a rent listing, the EMI calculator must not appear — not even as a collapsed section.

---

### 7.2 — Remove `EMICalculator` from locality pages

**File:** `client/app/[city]/[locality]/page.tsx`

Locality pages aggregate listings across a neighborhood. They are rent-focused (students, PG, hostel audiences).

Remove the `<EMICalculator />` import and usage from this page entirely. Do not replace it with anything — the section is simply removed.

Also check:
- `client/app/[city]/page.tsx` — city landing page
- `client/app/[city]/[locality]/[type]/page.tsx` — type-filtered locality page
- `client/app/[city]/[locality]/under-[budget]/page.tsx` — budget-filtered locality page

Remove `EMICalculator` from all of these if present.

---

## Step-by-Step Execution Plan

1. Mark Phase 7 as `IN_PROGRESS` in `status.md`.
2. Search for all usages of `EMICalculator` across the `client/app/` directory.
3. In listing detail page: add `listing.intent === 'buy'` guard.
4. In locality pages and city pages: remove `<EMICalculator />` usage and its import.
5. Confirm no orphaned imports remain.
6. Update `status.md`.

---

## Validation Criteria

- [ ] EMI calculator renders on a buy listing detail page
- [ ] EMI calculator does NOT render on a rent listing detail page
- [ ] EMI calculator does NOT appear on any locality page (`/[city]/[locality]/`)
- [ ] EMI calculator does NOT appear on city pages (`/[city]/`)
- [ ] No TypeScript import errors from removed usages
