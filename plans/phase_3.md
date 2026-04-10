# Phase 3 — Authentication Redesign

## Status: `NOT_STARTED`

## Objective

Replace the current OTP-as-login model with a proper dual-state auth system:
1. **Authenticated user** — logs in with email+password or Google OAuth
2. **Verified poster** — authenticated user who has also verified email via OTP and provided a phone number

These are two distinct states. Google OAuth alone does NOT make someone a verified poster.

## Dependencies

- Phase 2 COMPLETED (schema must be updated before auth routes are rebuilt)

---

## Subtasks

### 3.1 — Update `users` schema for new auth model

**File:** `server/src/db/schema.ts` — `users` table

Add new columns:
```ts
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),    // null for OAuth users
  googleId: varchar('google_id', { length: 255 }).unique(),   // null for email/pass users
  name: varchar('name', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  emailVerified: boolean('email_verified').default(false).notNull(),
  isPosterVerified: boolean('is_poster_verified').default(false).notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Rule:** `isPosterVerified` = `emailVerified === true && phone !== null`
This invariant is maintained by the server on every phone/OTP update — never computed client-side.

---

### 3.2 — Backend: `POST /api/auth/register`

**File:** `server/src/routes/auth.ts`

Input: `{ name, email, password }`

Validation (Zod):
- `name`: string, 1–100 chars
- `email`: valid email
- `password`: min 8 chars

Logic:
1. Check if email already exists → return `409 { error: 'Email already registered.' }`
2. Hash password with `bcrypt` (12 rounds)
3. Insert new user with `emailVerified: false`, `isPosterVerified: false`
4. Sign JWT and set `auth_token` cookie
5. Return `{ user: { id, email, name, emailVerified, isPosterVerified, isAdmin } }`

---

### 3.3 — Backend: `POST /api/auth/login`

**File:** `server/src/routes/auth.ts`

Input: `{ email, password }`

Logic:
1. Fetch user by email
2. If not found OR `passwordHash` is null (OAuth user) → `401 { error: 'Invalid credentials.' }`
3. `bcrypt.compare(password, user.passwordHash)` — on failure → `401`
4. Sign JWT, set cookie
5. Return user object (same shape as register)

---

### 3.4 — Backend: Google OAuth flow

**Files:** `server/src/routes/auth.ts`, new middleware or library

Use `passport` with `passport-google-oauth20`, or a manual OAuth2 flow (simpler with no extra dependency).

Two routes:
- `GET /api/auth/google` — redirects to Google consent screen
- `GET /api/auth/google/callback` — handles callback, upserts user

Logic in callback:
1. Decode Google profile (id, email, name)
2. Upsert user: `INSERT ... ON CONFLICT (email) DO UPDATE SET googleId = ...`
   - If existing user had only password auth, attach `googleId` to the same row
3. Sign JWT, set cookie, redirect to frontend (e.g. `/dashboard`)
4. Google OAuth does NOT set `emailVerified = true` (per product spec)

**Environment variables needed:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`

---

### 3.5 — Backend: OTP now serves poster verification only

**File:** `server/src/routes/auth.ts`

The existing `/send-otp` and `/verify-otp` endpoints are now gated behind `requireAuth` and serve only to verify email for poster status:

- `POST /api/auth/send-otp` — requires auth cookie; sends OTP to the authenticated user's email
- `POST /api/auth/verify-otp` — requires auth cookie; on success, sets `emailVerified = true` and recalculates `isPosterVerified`

Remove the OTP-as-login logic entirely. OTP no longer creates or logs in users.

**Update `isPosterVerified` after email verification:**
```ts
const isPosterVerified = !!(user.phone);  // phone already set? → now fully verified
await db.update(users).set({ emailVerified: true, isPosterVerified }).where(eq(users.id, userId));
```

---

### 3.6 — Backend: Phone number sets `isPosterVerified`

**File:** `server/src/routes/auth.ts` — `PATCH /api/auth/profile` (or a new `PATCH /api/auth/phone`)

When a user updates their phone number:
1. Validate Indian phone format (existing regex)
2. Update `phone` in DB
3. Recalculate: `isPosterVerified = user.emailVerified && phone !== null`
4. Update `isPosterVerified` in same DB call
5. Return updated user

---

### 3.7 — Backend: Guard listing publish behind `isPosterVerified`

**File:** `server/src/routes/listings.ts` — the endpoint that updates listing `status` to `active`

When a user tries to set a listing's `status` to `active`:
1. Fetch the user from DB (not from JWT — check actual DB value of `isPosterVerified`)
2. If `!user.isPosterVerified` → `403 { error: 'Complete poster verification before publishing.' }`
3. Draft creation (status = `draft`) is allowed for any authenticated user
4. Only publishing is blocked

---

### 3.8 — Frontend: `/auth/login` page

**File:** `client/app/auth/login/page.tsx` (new route, separate from current `auth/page.tsx`)

UI:
- Email + password form (react-hook-form + Zod)
- "Sign in with Google" button (links to `/api/auth/google`)
- Link to `/auth/register`
- Error display below form

On success: redirect to `/dashboard` or the `?redirect` query param.

---

### 3.9 — Frontend: `/auth/register` page

**File:** `client/app/auth/register/page.tsx` (new)

UI:
- Name, email, password, confirm password (react-hook-form + Zod)
- "Continue with Google" button
- Link back to login
- Error display

On success: redirect to `/dashboard`.

---

### 3.10 — Frontend: Poster verification flow

**File:** `client/components/auth/PosterVerificationModal.tsx` (new)

This modal/flow appears when a logged-in user tries to publish a listing but is not yet a verified poster.

Two-step UI:
- **Step 1 — Email OTP:** Input field for 6-digit OTP; "Send OTP" button calls `/api/auth/send-otp`; on verify, calls `/api/auth/verify-otp`
- **Step 2 — Phone number:** Input for phone; on submit, calls `PATCH /api/auth/profile`

After both steps complete, `isPosterVerified` is true and the listing can be published.

---

### 3.11 — Frontend: Update Navbar

**File:** `client/components/layout/Navbar.tsx`

Changes:
- When logged in: show user name/email, logout button
- Show "Verified Poster" badge or "Get Verified" link based on `isPosterVerified`
- Remove any OTP modal trigger from navbar
- Add links to `/auth/login` and `/auth/register` when logged out

---

### 3.12 — Frontend: Draft listing flow

**Files:** `client/app/dashboard/listings/new/page.tsx`, listing form

Logic:
- Any logged-in user can create a listing (saved as `draft`)
- On the listing form, if user is not `isPosterVerified`, show a banner: "Complete verification to publish"
- The publish/activate button is disabled and triggers the `PosterVerificationModal` instead
- Once verified, the button activates and calls the publish endpoint

---

## Step-by-Step Execution Plan

1. Mark Phase 3 as `IN_PROGRESS` in `status.md`.
2. Update `users` schema (3.1) — do this alongside Phase 2.1 schema work if not already done.
3. Install `bcrypt` and its types: `npm install bcrypt @types/bcrypt` in `/server`.
4. Implement `POST /api/auth/register` (3.2).
5. Implement `POST /api/auth/login` (3.3).
6. Implement Google OAuth routes (3.4) — install `passport passport-google-oauth20` or implement manually.
7. Update OTP routes to be auth-gated poster verification (3.5).
8. Update profile PATCH to compute `isPosterVerified` (3.6).
9. Add publish guard to listings route (3.7).
10. Build `/auth/login` page (3.8).
11. Build `/auth/register` page (3.9).
12. Build `PosterVerificationModal` (3.10).
13. Update Navbar (3.11).
14. Update listing form for draft flow (3.12).
15. Update `status.md`.

---

## Validation Criteria

- [ ] `POST /api/auth/register` creates a user with hashed password, returns JWT cookie
- [ ] `POST /api/auth/login` validates password, returns JWT cookie
- [ ] Google OAuth redirects to Google, creates/updates user on callback
- [ ] OTP routes require auth — they no longer create or log in users
- [ ] After email OTP verify → `emailVerified = true` in DB
- [ ] After phone save → `isPosterVerified = true` if `emailVerified` also true
- [ ] Listing publish with status `active` is blocked for non-verified posters (returns 403)
- [ ] Draft listing creation is allowed for any authenticated user
- [ ] `/auth/login` page works with email/password and Google button
- [ ] `/auth/register` page creates a new account
- [ ] Poster verification modal completes in two steps and updates user state
- [ ] Navbar reflects auth state correctly (logged in vs out, verified vs not)
