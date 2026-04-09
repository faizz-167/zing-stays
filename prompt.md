# Product Requirements Prompt (PRP)

## 1. Product Name

**ZindStay**

---

## 2. One-Sentence Idea Description

A student- and bachelor-focused real estate marketplace that helps users quickly find affordable, verified rental rooms, PGs, and shared accommodations with high-quality search and trustworthy listings.

---

## 3. Target Audience

### Primary Users

* Working bachelors seeking affordable shared housing
* Individuals searching for PGs, hostels, or budget rentals
* College students relocating to new cities

### Secondary Users

* Property owners renting out rooms, PGs, or apartments
* Small PG/hostel operators managing multiple room types

---

## 4. User Journey / Flow

### A. Tenant / User Journey

1. User lands on homepage
2. Enters city, locality, or landmark in search
3. Views filtered listing results (price, room type, amenities)
4. Opens a listing to view details (images, price, room type, features)
5. Clicks “View Contact”
6. Prompted to log in via phone OTP
7. After login, phone number is revealed
8. User contacts owner directly
9. User can save or revisit listings

---

### B. Owner Journey

1. Owner logs in using phone number
2. Starts posting a listing (quick flow)
3. Adds basic details:

   * location
   * price
   * room type
   * images
4. Listing is published immediately
5. Owner is prompted to improve listing quality
6. Adds more details (amenities, food, rules, etc.)
7. Listing visibility improves
8. Owner receives inquiries from users

---

### C. Trust Flow

1. Owner verifies phone number
2. Listings are evaluated based on completeness
3. High-quality listings are ranked higher
4. Suspicious or duplicate listings are deprioritized
5. Users see trust indicators like:

   * phone verified
   * well-detailed listing

---

## 5. Core Features

### Discovery & Search

* Search by city, locality, and landmarks
* Filters:

  * price range
  * room type (single, double, shared)
  * property type (PG, hostel, apartment)
  * food included
  * gender preference
* Fast and relevant search results

---

### Listing Experience

* Image-first listing cards
* Detailed listing pages
* Clear pricing and room information
* Structured data (not free-form descriptions)

---

### Contact System

* “View Contact” gated behind login
* Phone number reveal after authentication
* Lead tracking for interactions

---

### Owner Listing System

* Quick listing creation flow
* Progressive enrichment (add more details later)
* Image upload and management
* Listing performance improvement prompts

---

### Trust & Quality Layer

* Phone verification for all owners
* Listing completeness scoring
* Duplicate detection
* Trust badges:

  * phone verified
  * well detailed
  * recently updated

---

### User Features

* Save/favorite listings
* Revisit viewed listings
* Simple and fast browsing experience

---

### Admin Controls (Basic)

* Remove or deactivate listings
* Monitor suspicious activity
* Manage listing visibility

---

## 6. Suggested Tools / Stack

### Frontend

* Next.js (SEO-focused rendering)
* TanStack Query for data handling
* Zod for validation

### Backend

* Node.js with Express
* JWT-based authentication

### Database

* Neon

### Search

* Meilisearch

### Media

* ImageKit.io

### Authentication

* Phone OTP (Firebase or SMS provider abstraction)

---
## 8. Future Feature Ideas

### Trust & Verification

* Verified property badge (manual or semi-automated)
* Owner rating and response score
* Fraud detection improvements

---

### Discovery Enhancements

* Map-based search view
* Personalized recommendations
* Smart ranking based on user behavior

---

### Communication

* In-app chat between user and owner
* Call masking system
* Notification system (SMS / WhatsApp)

---

### Monetization

* Paid listing boosts
* Premium owner plans
* Featured listings

---

### Student-Focused Additions

* “Near college” tagging
* Short-term stay filters
* Roommate matching

---

### Analytics & Insights

* Owner dashboard with listing performance
* User behavior tracking
* Conversion optimization tools

---

## 9. Product Positioning

StayEasy is positioned as:

> A structured, student-first real estate marketplace that prioritizes affordability, clarity, and trust over volume and clutter.

---

## 10. Success Metrics (High-Level)

* Number of active listings
* Search-to-contact conversion rate
* Listing completion rate
* Repeat user visits
* Contact interactions per listing

---
