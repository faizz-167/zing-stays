# ZingBrokers Architecture

## 1. System Overview

ZingBrokers is a two-application web platform for student and bachelor-focused rental discovery.

- `client/`: Next.js frontend for discovery, authentication, dashboard operations, favorites, and admin moderation UI.
- `server/`: Express API that handles auth, listings CRUD, favorites, contact reveal, image upload auth, and admin actions.
- `Postgres (Neon)`: primary system of record for users, OTP sessions, listings, favorites, and contact leads.
- `Meilisearch`: secondary search/read model used for text search and sortable/filterable listing discovery.
- `ImageKit`: media upload/storage path for listing photos.
- `SMTP/Nodemailer`: OTP email delivery.

At a high level:

1. Users interact with the Next.js App Router frontend.
2. The frontend calls the Express API with `fetch` through `client/lib/api.ts`.
3. The API validates requests with `zod`, authenticates with JWT, persists to Postgres via Drizzle ORM, and syncs searchable listing data into Meilisearch.
4. Authenticated listing creation/editing can request ImageKit upload signatures from the API, then upload files directly from the browser to ImageKit.

## 2. Architecture Flow

```text
Browser
  -> Next.js client app
  -> React Query hooks / local auth state
  -> Express REST API
      -> Auth middleware / Zod validation
      -> Drizzle ORM
      -> Neon Postgres
      -> Meilisearch
      -> ImageKit auth params
      -> Nodemailer / SMTP
```

### Core user flows

#### A. OTP authentication flow

1. User opens `/auth` or an auth-gated action such as contact reveal.
2. `OtpModal` posts email to `POST /api/auth/send-otp`.
3. Server rate-limits by IP in-memory, generates OTP, hashes it with HMAC, stores it in `otp_sessions`, and sends email through SMTP.
4. User submits the OTP to `POST /api/auth/verify-otp`.
5. Server verifies the OTP, creates or updates the user row, derives admin status from `ADMIN_EMAIL`, signs a JWT, and returns `{ token, user }`.
6. Frontend stores token and user in `localStorage` through `AuthProvider`.

#### B. Listing creation/edit flow

1. Authenticated owner opens dashboard listing form.
2. `ListingForm` validates client-side with `zod`.
3. For images, `ImageUploader` calls `GET /api/images/auth`.
4. Server returns ImageKit auth parameters.
5. Browser uploads files directly to ImageKit and receives image URLs.
6. Form submits to `POST /api/listings` or `PUT /api/listings/:id`.
7. Server validates payload, calculates completeness, writes to Postgres, then asynchronously upserts the search document in Meilisearch.

#### C. Public search/browse flow

1. Home page search or listing filters route the user to `/listings`.
2. `useSearch` calls `GET /api/search`.
3. Express builds Meilisearch filters from query params and executes full-text search against the `listings` index.
4. Search results are rendered as cards.

There is also a non-search listing path:

1. Owner/dashboard or filtered browse can call `GET /api/listings`.
2. Server queries Postgres directly, applies structured filters, and sorts by `completenessScore`.

#### D. Listing detail and contact reveal flow

1. Listing detail page fetches `GET /api/listings/:id`.
2. Server returns full listing data plus computed trust badges and owner display name.
3. When user clicks contact reveal, `ContactButton` either opens OTP auth or calls `POST /api/listings/:id/contact`.
4. Server stores a `contact_leads` row and returns owner phone/name if available.

#### E. Favorites flow

1. Authenticated user saves/removes favorites from UI.
2. Frontend uses React Query mutations against `POST /api/favorites` and `DELETE /api/favorites/:listingId`.
3. Server persists favorites in Postgres and returns current saved listings from `GET /api/favorites`.

#### F. Admin moderation flow

1. Admin user logs in with the configured admin email.
2. Frontend admin page calls `GET /api/admin/listings`.
3. Admin can update listing status through `PUT /api/admin/listings/:id/status`.
4. Server writes the new status to Postgres and either removes or reindexes the listing in Meilisearch.

## 3. Module Breakdown

### Frontend modules (`client/`)

#### App shell and routing

- `app/layout.tsx`: root layout, fonts, global providers, navbar/footer.
- `app/page.tsx`: landing page.
- `app/listings/page.tsx`: search/browse page.
- `app/listings/[id]/page.tsx`: SSR-like listing detail page using `fetch`.
- `app/auth/page.tsx`: dedicated auth entry.
- `app/dashboard/**`: authenticated owner area.
- `app/admin/page.tsx`: admin moderation UI.

#### Providers and state

- `components/providers/QueryProvider.tsx`: React Query provider and devtools.
- `components/providers/AuthProvider.tsx`: auth bootstrap from `localStorage`, login/logout mutations to local state.
- `lib/queryClient.ts`: shared React Query defaults.
- `lib/auth.ts`: auth context, stored token/user helpers.

#### API access and schemas

- `lib/api.ts`: thin REST client wrapper, injects bearer token from `localStorage`.
- `lib/schemas/auth.ts`: client-side OTP/email validation.
- `lib/schemas/listing.ts`: client-side listing form validation.
- `lib/types.ts`: UI-facing listing/admin types.

#### Domain UI components

- `components/auth/OtpModal.tsx`: email OTP login modal.
- `components/forms/ListingForm.tsx`: create/edit listing workflow.
- `components/forms/ImageUploader.tsx`: ImageKit direct-upload integration.
- `components/forms/CompletenessBar.tsx`: listing completeness feedback.
- `components/listings/*`: listing cards, gallery, filters, contact reveal.
- `components/search/SearchBar.tsx`: entry search bar.
- `components/layout/*`: navbar/footer.
- `components/ui/*`: shared presentational components.

#### Frontend data hooks

- `hooks/useSearch.ts`: listing search and direct listings queries.
- `hooks/useFavorites.ts`: favorites query/mutations.

### Backend modules (`server/`)

#### Entry point and middleware

- `src/index.ts`: Express bootstrap, CORS/Helmet/JSON middleware, route registration, health endpoint, search index setup.
- `src/middleware/auth.ts`: JWT auth guard plus DB-backed admin verification.
- `src/lib/jwt.ts`: JWT sign/verify utilities.

#### Route modules

- `src/routes/auth.ts`
  - send OTP
  - verify OTP
  - get current user
  - patch profile
- `src/routes/listings.ts`
  - public list and detail
  - owner CRUD
  - contact reveal
- `src/routes/search.ts`
  - full-text search against Meilisearch
- `src/routes/favorites.ts`
  - save/remove/list favorites
- `src/routes/images.ts`
  - ImageKit upload auth params
- `src/routes/admin.ts`
  - list moderation queue
  - activate/deactivate/draft listing status

#### Service modules

- `src/services/otp.ts`: OTP generation, hashing, cooldown, SMTP delivery, verification attempt tracking.
- `src/services/search.ts`: Meilisearch client, index settings, add/delete document sync.
- `src/services/completeness.ts`: listing score and trust badge derivation.
- `src/services/imagekit.ts`: ImageKit server-side auth parameter generation.

#### Data access

- `src/db/schema.ts`: Drizzle schema and enums.
- `src/db/index.ts`: Postgres pool + Drizzle initialization.
- `drizzle.config.ts`: schema/push/generate configuration.

### Data/storage modules

#### Postgres tables

- `users`: identity, profile, admin flag.
- `otp_sessions`: hashed OTPs, expiry, attempt counts.
- `listings`: core marketplace entity.
- `favorites`: user-to-listing saved relation.
- `contact_leads`: user-to-listing contact reveal audit.

#### Search index

Meilisearch `listings` index stores a flattened search document with:

- text fields: title, description, city, locality, landmark
- filter fields: city, locality, room type, property type, food included, gender, price, status
- sort fields: price, completeness score, created_at

## 4. Tech Stack

### Frontend

- Next.js `16.2.2`
- React `19.2.4`
- TypeScript
- App Router
- React Query `@tanstack/react-query`
- Zod for client validation
- Tailwind CSS v4
- `next/font` with Playfair Display, Source Sans 3, IBM Plex Mono
- `next/image` for remote ImageKit images

### Backend

- Node.js + Express `5`
- TypeScript
- Drizzle ORM
- `pg` for PostgreSQL connectivity
- `jsonwebtoken` for JWT auth
- `helmet` for security headers
- `cors` for cross-origin API access
- `dotenv` for configuration
- `nodemailer` for OTP mail
- `zod` for request validation

### Infrastructure / external services

- Neon Postgres
- Meilisearch
- ImageKit
- SMTP server for email OTP delivery

## 5. Data and Trust Model

### Authentication model

- Email-only login with OTP verification.
- JWT is issued by the API and stored client-side in `localStorage`.
- Protected API routes require `Authorization: Bearer <token>`.
- Admin access is not role-managed separately; it is derived from matching the authenticated email to `ADMIN_EMAIL`.

### Listing quality model

- Each listing gets a `completenessScore` from location, pricing, media count, description depth, amenities, and optional metadata.
- Trust badges are computed dynamically:
  - `verified_owner`
  - `well_detailed`
  - `recently_updated`
- Public Postgres listing queries rank by completeness score.
- Search ranking can also sort on `completeness_score`.

## 6. API Surface Summary

### Auth

- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `GET /api/auth/me`
- `PATCH /api/auth/profile`

### Listings

- `GET /api/listings`
- `GET /api/listings/mine`
- `GET /api/listings/:id`
- `POST /api/listings`
- `PUT /api/listings/:id`
- `DELETE /api/listings/:id`
- `POST /api/listings/:id/contact`

### Search and favorites

- `GET /api/search`
- `GET /api/favorites`
- `POST /api/favorites`
- `DELETE /api/favorites/:listingId`

### Media and admin

- `GET /api/images/auth`
- `GET /api/admin/listings`
- `PUT /api/admin/listings/:id/status`

## 7. Architectural Characteristics

### Strengths

- Clear frontend/backend separation.
- Validation exists on both client and server with Zod.
- Search concerns are separated from transactional data storage.
- Media upload avoids proxying large files through the application server.
- Trust/completeness logic is centralized on the backend.

### Important implementation characteristics

- Authentication state is purely client-managed; there is no cookie/session-based SSR auth.
- Search is eventually consistent because Meilisearch sync happens after DB writes.
- OTP rate limiting is in-memory per API instance, so it is not distributed across multiple server instances.
- Admin authorization depends on a single configured email rather than a richer RBAC model.
- Listing detail page fetches from the API using `NEXT_PUBLIC_API_URL`, so frontend and backend deployment configuration must stay aligned.

## 8. Suggested Mental Model

Think of the system as four layers:

1. `Presentation layer`: Next.js pages, components, providers, React Query hooks.
2. `API layer`: Express routes plus auth/validation middleware.
3. `Domain/service layer`: OTP, search sync, completeness scoring, image upload auth.
4. `Persistence/integration layer`: Postgres via Drizzle, Meilisearch, ImageKit, SMTP.

That separation is the current practical architecture of the repository.
