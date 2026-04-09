# Search Experience Enhancements

## Objective

Improve the property search flow so users:

1. choose whether they want to `Buy` or `Rent`,
2. choose a city,
3. choose up to 3 localities within that city,
4. see nearby locality suggestions after selecting one locality,
5. choose the relevant property type based on `Buy` or `Rent`,
6. search with clearer, faster, and more guided interactions.

This note compares the current implementation with the requested experience and lists the improvements that should be made.

## What Is Currently There

### 1. Search entry is a single free-text field

- The homepage and listings page both use the same `SearchBar` component.
- It currently has only one text input with the placeholder: `Search by city, locality or landmark...`
- On submit, it navigates to `/listings?q=...`
- There is no guided sequence such as transaction mode -> city -> locality -> property type.

### 2. Filters exist, but only after search results load

- The listings page has sidebar filters for:
  - price range
  - room type
  - property type
  - gender preference
  - food included
- This means the user first searches broadly, then refines on the results page.
- The requested reference flow is different because it asks users to make the main decisions in the top search bar before searching.

### 3. Backend supports only one city and one exact locality filter

- `/api/search` supports:
  - `q`
  - `city`
  - `locality`
  - `room_type`
  - `property_type`
  - `food_included`
  - `gender`
  - `price_min`
  - `price_max`
- There is no `intent` or `listing mode` filter such as `buy` or `rent`.
- `city` and `locality` are both single-value filters.
- There is no support for selecting multiple localities.
- There is no dedicated suggestion/autocomplete endpoint for cities or localities.

### 4. Search index is searchable, but not structured for guided suggestions

- Meilisearch indexes:
  - title
  - description
  - city
  - locality
  - landmark
- This helps general text search, but it does not yet provide a clean "pick city first, then suggest matching localities" experience.
- There is also no city-locality catalog exposed to the frontend.

### 5. Listing data model is simple and single-location based

- Each listing stores:
  - no buy/rent transaction mode
  - one `city`
  - one `locality`
  - optional `landmark`
  - one `roomType`
  - one `propertyType`
- This is sufficient for basic search, but not enough for a richer guided search unless transaction type and location values are both modeled more clearly.

## Gaps Between Current State and Requested Experience

### 1. No city-first search flow

- Users can currently type anything first.
- The requested behavior requires users to first choose `Buy` or `Rent`, then select a city.
- This matters because both locality suggestions and property options should depend on the earlier selections.

### 2. No buy/rent mode in search

- The current app does not let users choose whether they want to buy or rent before searching.
- Your requirement needs two primary top-level modes:
  - `Buy`
  - `Rent`
- Property choices must change based on the selected mode.

### 3. No multi-locality selection

- The current backend and frontend only handle one locality.
- The requested behavior allows users to select up to 3 localities.

### 4. No locality autocomplete dropdown with city context

- The reference shows locality suggestions while typing.
- The current app does not show suggestions.
- The request specifically says that when users search localities, the city should also appear in the suggestion so selection is easier.

### 5. No nearby-locality recommendations after a locality is selected

- The current app does not show nearby places once the user picks a locality.
- Your reference expects the search UI to suggest nearby localities as quick-add options.
- This is important because many users know one familiar area and then want the product to help expand the search to surrounding neighborhoods.

### 6. Property choice is not part of the main top search workflow

- Right now property type is only a sidebar filter on the results page.
- The new design expects this choice to happen in the main search bar before running the search.

### 7. Current taxonomy does not fully match the requested behavior

- The product currently supports rental-focused property types such as `pg`, `hostel`, `apartment`, and `flat`.
- Your clarified requirement is:
  - if user selects `Buy`, show only options like `Full House` and `Apartment`
  - if user selects `Rent`, show options like `PG/Hostel`, `Full House`, and `Apartment`
- This means the taxonomy and backend values need alignment before implementation, otherwise the UI labels and backend values will drift.

## Improvements That Should Be Made

### A. Search UX Improvements

### 1. Replace the single text field with a structured search bar

The new top search experience should be:

1. `Buy / Rent` selector
2. `City` selector
3. `Localities` autocomplete multi-select, limited to 3
4. `Nearby Localities` quick-add row after one locality is selected
5. `Property Type` selector
6. `Search` button

Recommended behavior:

- User first selects `Buy` or `Rent`.
- City is selected next.
- Locality field stays disabled until a city is selected.
- After city selection, the locality field shows suggestions only from that city.
- After the first locality is selected, nearby localities are shown as quick-add chips.
- Property type options update when the user switches between `Buy` and `Rent`.
- Selected localities appear as chips/tags inside the field.
- Users can remove any selected locality before search.

### 2. Add transaction mode tabs or segmented control

The top search bar should begin with a strong primary toggle:

- `Buy`
- `Rent`

Expected behavior:

- `Buy` changes the property type options to buy-relevant inventory only.
- `Rent` changes the property type options to rental-relevant inventory only.
- The selection should persist in the URL and on the results page.

Recommended query param:

- `intent=buy`
- `intent=rent`

### 3. Show locality suggestions with city label

When the user types in the locality field:

- show matching locality suggestions,
- include city in each suggestion label,
- optionally include state if available.

Suggested display format:

- `Adambakkam, Chennai`
- `Koramangala, Bangalore`
- `Aundh, Pune`

This directly matches the user request that city should appear when localities are searched.

### 4. Show nearby localities after the first locality is selected

Once the user selects one locality:

- show a `Nearby Localities` row below the locality field,
- populate it with nearby or adjacent areas from the same city,
- let users add them with one click,
- exclude already selected localities,
- stop allowing more additions once the user reaches the max of 3 selected localities.

Suggested interaction:

- selected locality: `Velachery`
- nearby suggestions: `Adambakkam`, `Madipakkam`, `Guindy`, `Taramani`

This matches the reference pattern where choosing one locality helps users discover nearby places quickly.

### 5. Enforce max 3 localities in the UI

- Users should not be able to select more than 3 localities.
- Once 3 are selected:
  - disable additional selection, or
  - show a validation message such as `You can select up to 3 localities`.

### 6. Move property type selection into the main search bar

- The property or house-type choice should be part of the hero search experience, not only a sidebar filter.
- This reduces clicks and matches the reference flow.

Recommended option mapping based on your requirement:

- For `Buy`:
  - `Full House`
  - `Apartment`

- For `Rent`:
  - `PG/Hostel`
  - `Full House`
  - `Apartment`

Important note:

- the current backend property enum values are `pg`, `hostel`, `apartment`, and `flat`
- UI labels such as `Full House` will need mapping to backend values such as `flat` or a newly defined canonical value
- `PG/Hostel` may be a grouped UI option that maps to multiple backend values unless the data model is simplified

### B. Backend and API Improvements

### 1. Add support for multiple localities

Current limitation:

- only one `locality` value can be sent to `/api/search`.

Required improvement:

- support up to 3 localities in search requests.

Recommended API shape:

- `city=Bangalore`
- `localities=Koramangala,Indiranagar,HSR Layout`

or repeated params:

- `localities=Koramangala`
- `localities=Indiranagar`
- `localities=HSR Layout`

Backend behavior:

- validate max 3 localities,
- apply an `OR` filter across selected localities,
- keep city filter mandatory when localities are supplied.

### 2. Add search intent support

Current limitation:

- there is no field that distinguishes listings meant for sale versus listings meant for rent.

Required improvement:

- add a search-level and listing-level field such as `intent` or `listingMode`
- supported values:
  - `buy`
  - `rent`

Backend behavior:

- `Buy` results should only show listings marked for sale
- `Rent` results should only show listings marked for rent
- property type options must be validated against the selected intent

### 3. Add a location suggestion endpoint

The frontend needs a dedicated endpoint for dropdown suggestions.

Recommended endpoint:

- `/api/locations/suggest?city=Chennai&q=ada`

Recommended response:

- list of matching localities for the selected city
- include label fields suitable for display

Example response shape:

```json
[
  { "city": "Chennai", "locality": "Adambakkam", "label": "Adambakkam, Chennai" },
  { "city": "Chennai", "locality": "Ayanavaram", "label": "Ayanavaram, Chennai" }
]
```

### 4. Add nearby-locality lookup support

The frontend also needs a way to fetch nearby places after one locality is selected.

Recommended endpoint:

- `/api/locations/nearby?city=Chennai&locality=Velachery`

Recommended response:

- nearby localities ordered by relevance or proximity,
- limited to a small list suitable for quick-add chips.

Example response shape:

```json
[
  { "city": "Chennai", "locality": "Adambakkam", "label": "Adambakkam, Chennai" },
  { "city": "Chennai", "locality": "Madipakkam", "label": "Madipakkam, Chennai" },
  { "city": "Chennai", "locality": "Guindy", "label": "Guindy, Chennai" }
]
```

Data requirement:

- this cannot be inferred reliably from raw listing text alone,
- the system needs either:
  - a curated nearby-locality mapping,
  - geo coordinates per locality, or
  - a location dataset with adjacency or proximity relationships.

### 5. Normalize city and locality values

This is important because suggestion quality depends on clean data.

Problems likely to happen without normalization:

- `Bangalore` vs `Bengaluru`
- `HSR` vs `HSR Layout`
- casing inconsistencies
- duplicated localities with slightly different spellings

Improvements needed:

- normalize stored city/locality values,
- define canonical display names,
- consider a separate `locations` table or a derived searchable location index,
- make listing creation reuse canonical city/locality values instead of free-form typing only.

### C. Search Logic Improvements

### 1. Search should be dependency-aware

Expected search logic:

- intent narrows the allowed property types,
- city narrows the locality search space,
- localities narrow the property search,
- the first selected locality can trigger nearby-locality recommendations,
- property type further filters results.

This is more predictable than the current broad text search.

### 2. Keep free-text search optional, not primary

The current free-text search is still useful for landmarks and flexible discovery.

Recommended approach:

- keep `q` as an advanced or secondary field,
- make the structured selectors the primary experience,
- optionally allow landmark text inside the locality field only after city selection.

### 3. Keep query params shareable

The selected search state should remain in the URL so users can:

- refresh without losing filters,
- share search results,
- return to the same search later.

Example target URL:

`/listings?intent=rent&city=Chennai&localities=Adambakkam,Ayanavaram&property_group=pg-hostel`

### D. Frontend State and Interaction Improvements

### 1. Reset dependent fields correctly

When city changes:

- clear selected localities,
- clear locality suggestions,
- clear nearby-locality suggestions,
- optionally reset property type only if business wants city-specific categories.

When intent changes:

- clear the currently selected property type if it is no longer valid
- keep city only if the same city is allowed in both modes
- keep or clear localities based on product choice, but revalidate them before search

### 2. Debounce locality suggestion search

- Locality suggestions should not fire on every keystroke immediately.
- Use debouncing to reduce API calls and improve responsiveness.

### 3. Handle empty and loading states well

Examples:

- no city selected: `Select a city first`
- no localities found: `No matching localities in Chennai`
- loading suggestions: spinner or `Searching...`

### 4. Make the selected values visible and removable

- Users should clearly see:
  - selected city
  - selected localities
  - nearby recommended localities
  - selected property type
- Locality selections should be removable via chips/tags.

### E. Data and Admin Improvements

### 1. Improve listing creation inputs for location quality

If owners continue entering free-form city/locality text, search suggestions will become messy.

Recommended improvement:

- add a controlled `buy/rent` listing type field in the listing form,
- add controlled city and locality inputs in the listing form,
- reuse the same canonical city/locality source used by search,
- maintain a nearby-locality relationship source for search recommendations,
- prevent duplicate spellings from entering the system.

### 2. Add backfill and cleanup for existing listings

Before launching the improved search:

- audit existing city names,
- audit existing locality names,
- merge duplicates,
- standardize spelling and casing,
- reindex search data after cleanup.

## Recommended Rollout Order

### Phase 1: Core search behavior

- add `Buy / Rent` selector
- add city selector
- add locality multi-select with max 3
- show nearby-locality quick-add suggestions after the first locality is selected
- add property type in top search bar
- pass structured values into `/listings`

### Phase 2: Backend support

- add `intent` support for listings and search
- add multi-locality filtering
- add suggestion endpoint
- add nearby-locality lookup or mapping
- update Meilisearch or location lookup strategy

### Phase 3: Data quality

- normalize city/locality values
- clean existing listing data
- align owner listing form with canonical locations

### Phase 4: UX polish

- chips/tags for localities
- loading, empty, and error states
- responsive mobile version of the new search bar

## Acceptance Criteria

The enhancement can be considered complete when:

- users can choose `Buy` or `Rent` before searching,
- `Buy` only shows buy-relevant property options such as `Full House` and `Apartment`,
- `Rent` shows rental-relevant property options such as `PG/Hostel`, `Full House`, and `Apartment`,
- users must select a city before locality suggestions are shown,
- users can select up to 3 localities,
- each locality suggestion includes the city name,
- after one locality is selected, nearby localities are shown as quick-add options,
- users can choose property/house type before search,
- search results correctly apply intent + city + multi-locality + property filters,
- URL state is preserved,
- existing listing data does not produce duplicate or broken suggestions.

## Confirmed Product Direction

Based on your clarification, the required direction is:

- support both `Buy` and `Rent`
- show different property options based on the selected mode
- keep the guided flow as:
  - choose `Buy` or `Rent`
  - choose city
  - choose up to 3 localities
  - see nearby locality suggestions after selecting one
  - choose property type
  - search

This means the current rental-only assumptions in the codebase should be treated as a gap that needs to be addressed in both search and listing creation.
