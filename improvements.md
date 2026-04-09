# Product Improvement Brief

This document defines the intended product and UX changes for the next round of work. It is written as a short implementation brief so another AI or engineer can understand the desired outcome quickly.

## Scope

The work is split into five areas:

1. Foundation updates across the frontend
2. Guided search improvements on the homepage and listings search
3. Filter panel and listing card redesign
4. Authentication and poster verification redesign
5. Security and UX bug fixes

This brief intentionally does not include code-level instructions or schema details.

## Global Constraints

- The database will be cleared and the system will start fresh.
- Do not preserve compatibility with the current OTP-only auth flow.
- Keep the implementation brief and product-first.
- Use consistent URL-driven state for search and filters.
- Prioritize correctness of user flows over visual polish.

## 1. Foundation

Apply the following cross-cutting improvements:

- Standardize UI primitives using a consistent component system.
- Standardize form handling and validation across all forms.
- Fix URL and state synchronization for search so clearing a field and submitting updates the URL correctly, including empty search states.

Affected forms include:

- login and registration
- post listing and edit listing
- profile
- review form
- content editor

## 2. Guided Search Widget

Replace the homepage search bar with a guided search widget.

### Goal

Help users reach relevant listing results faster by guiding them through intent, city, locality, and contextual sub-filters.

### Homepage Widget Structure

Row 1:

- intent tabs: `Buy` and `Rent`

Row 2:

- city selector
- locality typeahead
- up to 3 selected locality chips, each removable
- search button

Row 3:

- after the first locality is selected, show nearby locality chips
- users can add nearby localities to broaden the search

Row 4:

- contextual sub-filter chips based on intent and property type

Rules:

- `Buy` should focus only on apartment and flat type inventory
- `PG` and `Hostel` sub-options should not appear for `Buy`
- apartment/flat options should surface BHK-style choices
- PG/Hostel options should surface occupancy-style choices

### Search Behavior

- Locality suggestions should appear while typing.
- Suggestions can be filtered client-side from the loaded list for the selected city.
- The widget must submit all selected state through URL parameters to the listings page.
- Multi-locality search must be supported.

### Backend Expectations

- support nearby localities lookup
- support multiple localities in search
- support BHK-related filtering in search

## 3. Filter Panel Redesign

Replace the current listings sidebar filter UI with a cleaner filter panel.

### Filters to Support

- BHK type
- price or rent range
- availability
- preferred tenants
- furnishing
- property type
- gender preference
- food included

### UX Requirements

- use chip-style controls where appropriate
- show active filter count in the filter header
- include a reset action that restores default state
- only show BHK-related filters when they are relevant to the selected intent or property type

### State Requirements

- all filters must remain URL-driven
- resetting filters must also reset the URL
- filters should not conflict with the homepage guided search state

## 4. Listing Card Redesign

Redesign listing cards to be more informative and easier to scan.

### Layout

- horizontal layout on desktop
- image on the left
- listing details on the right
- stacked or mobile-friendly layout on smaller screens

### Content

- title
- locality and city line
- explore nearby link
- price
- deposit when applicable
- area when available
- furnishing
- property type
- preferred tenants
- availability
- primary CTA for owner contact
- favorite action
- nearest landmark or distance information

### Goal

Make listing cards feel richer without forcing users to open the listing detail page for basic decision-making.

## 5. Authentication Redesign

Replace the current OTP-as-login model with a normal user authentication system plus a separate poster verification flow.

## Auth Model

There are two distinct states:

1. `Authenticated user`
2. `Verified poster`

These must not be treated as the same thing.

### Authenticated User

Normal users should be able to log in using:

- Google OAuth
- email and password

This is standard account access for browsing, saving favorites, and general logged-in actions.

### Verified Poster

Posting a public listing requires an extra verification flow.

A user becomes a verified poster only after:

- logging in
- verifying email via OTP
- providing a phone number

Phone number collection is required, but phone OTP verification is not required in this phase.

### Posting Flow

When a logged-in user clicks `Post`:

- allow them to create or edit a draft listing
- do not allow publishing until verification is complete

Verification gate before publish:

- email OTP verification completed
- phone number provided

### Important Product Decision

Google OAuth login does not automatically satisfy poster verification. Email OTP verification is still required before publishing a listing.

### Auth UX Pages

Provide separate pages for:

- login
- registration

The previous OTP login modal should no longer be the main authentication model.

## 6. EMI Calculator Behavior

- show the EMI calculator only on buy listings
- remove it from locality pages that are primarily rent-focused

## 7. Security and UX Fixes

These items should be treated as high priority.

### Owner Self-Review and Self-Lead Prevention

- owners must not be able to reveal contact details for their own listings
- owners must not be able to leave reviews on their own listings

### Review Moderation Failure

- do not silently report success if review moderation queueing fails
- the user should receive a proper failure response, or the review should be safely stored in a clearly pending state

### Review Eligibility Messaging

Do not hide the review section without explanation.

Show contextual messaging instead:

- not logged in: prompt user to sign in
- logged in but has not unlocked contact: explain that owner contact reveal is required before reviewing
- eligible user: show the review form

## Edge Cases

The implementation should account for the following:

- user clears search text or filters and submits again
- user selects multiple localities and then removes one or all
- user switches between `Buy` and `Rent` after selecting filters that are no longer valid
- user creates a draft listing before completing poster verification
- user tries to publish without verified email or without a phone number
- logged-in user can use normal app features without being a verified poster
- owner cannot create artificial leads or reviews on their own listing
- review submission cannot silently succeed if moderation infrastructure fails
- mobile layout must remain usable for the guided search widget and redesigned listing cards

## Suggested Delivery Order

Implement in this order:

1. security and review-related fixes
2. URL/state sync cleanup
3. auth redesign and poster verification flow
4. guided search widget
5. filter panel redesign
6. listing card redesign
7. EMI visibility cleanup

## Out of Scope

The following are intentionally not specified in this brief:

- code-level implementation details
- schema or migration details
- low-level API contracts
- rollout or backward-compatibility strategy for existing users, since the database will be reset
