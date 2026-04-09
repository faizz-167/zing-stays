# Phase 2 — Auth Refactor & Redis Layer

## Objective
Move JWT from response body/localStorage to Secure HTTP-only cookies to enable SSR auth and protect public SEO pages. Set up Redis as a caching and rate-limiting layer. Public pages must remain fully accessible without auth.

## Status: COMPLETED

## Dependencies
- Phase 1 COMPLETED (schema stable before auth refactor)

---

## Subtasks

### 2.1 — Install Redis client on Express
**File:** `server/package.json`

```bash
cd server && npm install ioredis
```

**File:** `server/src/lib/redis.ts` (new file)
```ts
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!);

export async function cacheGet(key: string) {
  const val = await redis.get(key);
  return val ? JSON.parse(val) : null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number) {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function cacheInvalidate(key: string) {
  await redis.del(key);
}
```

Add `REDIS_URL` to `server/.env.example`.

---

### 2.2 — Refactor JWT: issue in HTTP-only cookie
**File:** `server/src/routes/auth.ts`

After OTP verify success, instead of returning token in JSON body:
```ts
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});
res.json({ success: true, user: { id, email, name, isAdmin } });
```

Add logout endpoint that clears the cookie:
```ts
POST /api/auth/logout → res.clearCookie('auth_token') → { success: true }
```

---

### 2.3 — Update auth middleware to read JWT from cookie
**File:** `server/src/middleware/auth.ts`

Replace `Authorization: Bearer <token>` header logic with:
```ts
const token = req.cookies?.auth_token;
```

Install `cookie-parser` if not present:
```bash
cd server && npm install cookie-parser @types/cookie-parser
```

Register in `server/src/index.ts`:
```ts
import cookieParser from 'cookie-parser';
app.use(cookieParser());
```

Keep `Authorization` header fallback for API clients during transition.

---

### 2.4 — Update frontend AuthProvider
**File:** `client/components/providers/AuthProvider.tsx`

- Remove any `localStorage.setItem('token', ...)` or `sessionStorage` token storage.
- On login success, store only `{ user }` object in React state (not the token).
- Fetch `/api/auth/me` on mount to restore session from cookie.
- On logout: call `POST /api/auth/logout` then clear user state.

**File:** `client/lib/auth.ts`

- Remove `Authorization` header injection from fetch wrapper IF cookie is sent automatically (`credentials: 'include'` on all fetch calls).
- Ensure all API calls use `credentials: 'include'`.

---

### 2.5 — Verify public SEO pages remain accessible without auth
Manual test checklist:
- `/` home page loads without cookies
- `/listings` page loads without cookies
- `/listings/[id]` loads without cookies (contact reveal still requires auth)
- `/[city]` (Phase 3 routes) load without cookies

No auth middleware should be applied to these routes.

---

### 2.6 — Add Redis-backed rate limiting
**File:** `server/src/middleware/rateLimit.ts` (new file)

Implement sliding window rate limiter using Redis:
- OTP send: max 5 requests per email per 10 minutes
- OTP verify: max 10 attempts per email per 10 minutes
- Contact reveal: max 20 per user per hour

Apply to:
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/listings/:id/contact`

---

### 2.7 — Add Redis cache helper module
**Already covered in 2.1.** Ensure `cacheGet`/`cacheSet`/`cacheInvalidate` helpers are exported and used consistently across all routes that need caching.

Cache invalidation rules:
- When a listing is updated/deleted → invalidate listing cache key + SEO aggregation keys for its city/locality.

---

### 2.8 — Test cookie auth across all surfaces
Manual + automated verification:
- [ ] OTP login flow sets cookie in browser
- [ ] Dashboard `/dashboard` renders with authenticated user
- [ ] Admin `/admin` rejects unauthenticated requests with 401
- [ ] Public pages (`/`, `/listings`, `/listings/[id]`) work without cookie
- [ ] Logout clears cookie and redirects to `/`
- [ ] SSR pages on server can read cookie from request headers

---

## Step-by-Step Execution Plan

```
1. Install ioredis + cookie-parser on server
2. Create server/src/lib/redis.ts with cache helpers
3. Add REDIS_URL to .env.example
4. Refactor auth.ts: issue JWT in HTTP-only cookie on verify-otp
5. Add POST /api/auth/logout endpoint
6. Update auth middleware: read token from cookie (keep header fallback)
7. Register cookieParser in Express app
8. Update AuthProvider: remove localStorage token, add /api/auth/me restore
9. Add credentials: 'include' to all fetch calls in client
10. Build Redis rate limiter middleware
11. Apply rate limiter to OTP and contact-reveal endpoints
12. Run full auth flow end-to-end test
```

---

## Validation Criteria

All must pass before Phase 2 = COMPLETED:

- [ ] JWT issued as Secure HTTP-only cookie on login
- [ ] No JWT stored in localStorage or sessionStorage on client
- [ ] `auth_token` cookie present in browser after login
- [ ] Logout clears cookie successfully
- [ ] Dashboard and admin pages authenticate via cookie
- [ ] Public listing pages load without any auth cookie
- [ ] Rate limiter blocks OTP spam (> 5 send attempts per 10min returns 429)
- [ ] `redis.ts` helper module working with `cacheGet`/`cacheSet`/`cacheInvalidate`
- [ ] `REDIS_URL` documented in `.env.example`
