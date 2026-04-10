# Phase 1 — Security & Review Fixes

## Status: `COMPLETED`

## Objective

Fix the highest-priority security and UX bugs before any other work begins. These are correctness issues that affect data integrity and user trust.

## Dependencies

None. This phase is fully independent and must be completed first.

---

## Subtasks

### 1.1 — Block owner self-review on backend

**File:** `server/src/routes/reviews.ts` → `POST /` handler

**Problem:** The current handler checks only that the user contacted the owner. It never checks whether the reviewer IS the owner of the listing. An owner can review their own listing.

**What to do:**
1. After the contact-lead gate check, fetch the listing from `listings` table to get its `ownerId`.
2. Compare `listing.ownerId === userId`. If true, return `403 { error: 'Owners cannot review their own listing.' }`.
3. The check must happen before the review is inserted.

**Code location:** `server/src/routes/reviews.ts` line 20 — `router.post('/', ...)`

---

### 1.2 — Block owner self-lead on backend

**File:** `server/src/routes/listings.ts` — contact reveal / lead creation endpoint

**Problem:** Owners can reveal contact info of their own listing, which creates a fake lead and enables artificial review eligibility.

**What to do:**
1. Locate the endpoint that records a `contactLead` or returns owner contact info.
2. Fetch the listing `ownerId`.
3. If `ownerId === req.user.userId`, return `403 { error: 'You cannot contact yourself.' }`.
4. This must run before any lead is recorded and before contact details are returned.

---

### 1.3 — Fix review moderation queue silent failure

**File:** `server/src/routes/reviews.ts` line 48

**Problem:** If `moderationQueue.add(...)` throws, the error is silently caught and logged, but the API still returns `201`. The spec requires the user receive a proper failure response or that the review is clearly in pending state.

**Current behavior:**
```ts
moderationQueue.add('moderate-review', { reviewId: review.id }).catch(
  (err) => logger.error('moderationQueue add error', err),
);
res.status(201).json(review);
```

**What to do:**
Change the fire-and-forget `.catch()` to an awaited call. If the queue call fails, do NOT delete the review (it is already safely in `pending` state in the DB), but return a `202 Accepted` with a message indicating the review was received but moderation is delayed — OR return a `500` so the client knows something went wrong.

**Recommended approach:** Await the queue add. On failure, return `202` with `{ queued: false, message: 'Review saved. Moderation may be delayed.' }` so the client can show a different success message. This avoids losing the review while still surfacing the failure.

```ts
// Replace the fire-and-forget with:
try {
  await moderationQueue.add('moderate-review', { reviewId: review.id });
  res.status(201).json(review);
} catch (queueErr) {
  logger.error('moderationQueue add error', queueErr);
  // Review is safely in pending state in DB; surface the delay to the client
  res.status(202).json({ ...review, queued: false });
}
```

**Frontend (`ReviewForm.tsx`):** Handle `202` status — show message "Review received. It may take longer than usual to appear."

---

### 1.4 — Add contextual review eligibility UI

**File:** `client/components/listings/ReviewForm.tsx` and wherever it is rendered (listing detail page)

**Problem:** The review section either shows or hides without explanation. Users don't know why they can't review.

**Three states to handle:**

| State | Condition | UI to show |
|-------|-----------|-----------|
| Not logged in | No auth token / user is null | "Sign in to leave a review." with a link to `/auth/login` |
| Logged in, no contact unlock | User is auth'd but has no `contactLead` for this listing | "Reveal the owner's contact to unlock reviews." |
| Eligible | Auth'd + contact lead exists + not the owner | Show the review form |
| Already reviewed | Returns `409` | "You have already reviewed this listing." (existing) |
| Is the owner | `listing.ownerId === user.id` | "Owners cannot review their own listing." |

**What to do:**
1. Accept a `user` prop and `hasContacted` prop (boolean) on `ReviewForm`.
2. Or move the conditional rendering to the parent (listing detail page) and pass in the appropriate state.
3. The review form component itself should not be responsible for fetching auth state — receive it as props.
4. Use `react-hook-form` for the form fields (aligns with Phase 2 foundation rule).

---

## Step-by-Step Execution Plan

1. Mark Phase 1 as `IN_PROGRESS` in `status.md`.
2. Read `server/src/routes/listings.ts` to find the contact reveal endpoint before touching it.
3. Implement subtask 1.1 (self-review block).
4. Implement subtask 1.2 (self-lead block). Check the listing detail page for how contact reveal works.
5. Implement subtask 1.3 (queue failure handling) — both backend and frontend.
6. Implement subtask 1.4 (eligibility messaging) — read listing detail page to understand how `ReviewForm` is currently mounted.
7. Update `status.md` marking all subtasks COMPLETED.
8. Mark Phase 1 COMPLETED.

---

## Validation Criteria

Before marking Phase 1 complete, verify all of the following:

- [ ] Owner cannot submit a review for their own listing (backend returns 403)
- [ ] Owner cannot create a contact lead on their own listing (backend returns 403)
- [ ] If moderation queue fails, backend does NOT return 201 — returns 202 with clear message
- [ ] ReviewForm shows "Sign in" message when user is not authenticated
- [ ] ReviewForm shows "reveal contact first" message when user is logged in but has no contact lead
- [ ] ReviewForm shows "owners cannot review" message when viewer is the listing owner
- [ ] ReviewForm shows the form when user is eligible
- [ ] No regressions in review submission or contact reveal for normal users
