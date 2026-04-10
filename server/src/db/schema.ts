import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const intentEnum = pgEnum('intent', ['buy', 'rent']);
export const roomTypeEnum = pgEnum('room_type', [
  // For PG / Hostel
  'single', 'double', 'multiple',
  // For Apartment / Flat
  '1bhk', '2bhk', '3bhk', '4bhk',
]);
export const propertyTypeEnum = pgEnum('property_type', ['pg', 'hostel', 'apartment', 'flat']);
export const genderPrefEnum = pgEnum('gender_pref', ['male', 'female', 'any']);
export const furnishingEnum = pgEnum('furnishing', ['furnished', 'semi', 'unfurnished']);
export const preferredTenantsEnum = pgEnum('preferred_tenants', ['students', 'working', 'family', 'any']);
export const listingStatusEnum = pgEnum('listing_status', ['draft', 'active', 'inactive']);
export const contentTypeEnum = pgEnum('content_type', [
  'area_guide',
  'student_guide',
  'comparison',
  'rent_advice',
  'locality_insight',
]);

export const cities = pgTable('cities', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  state: varchar('state', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('cities_slug_idx').on(t.slug),
]);

export const localities = pgTable('localities', {
  id: serial('id').primaryKey(),
  cityId: integer('city_id').references(() => cities.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('localities_city_slug_idx').on(t.cityId, t.slug),
  index('localities_city_idx').on(t.cityId),
]);

export const localityNeighbors = pgTable('locality_neighbors', {
  localityId: integer('locality_id').references(() => localities.id, { onDelete: 'cascade' }).notNull(),
  neighborId: integer('neighbor_id').references(() => localities.id, { onDelete: 'cascade' }).notNull(),
}, (t) => [
  uniqueIndex('locality_neighbors_uniq').on(t.localityId, t.neighborId),
]);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  name: varchar('name', { length: 100 }),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const otpSessions = pgTable('otp_sessions', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('otp_email_idx').on(table.email),
  index('otp_expires_idx').on(table.expiresAt),
]);

export const listings = pgTable('listings', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  landmark: varchar('landmark', { length: 200 }),
  address: text('address'),
  price: integer('price').notNull(),
  roomType: roomTypeEnum('room_type').notNull(),
  propertyType: propertyTypeEnum('property_type').notNull(),
  foodIncluded: boolean('food_included').default(false).notNull(),
  genderPref: genderPrefEnum('gender_pref').default('any').notNull(),
  deposit: integer('deposit'),
  areaSqft: integer('area_sqft'),
  availableFrom: timestamp('available_from'),
  furnishing: furnishingEnum('furnishing'),
  preferredTenants: preferredTenantsEnum('preferred_tenants').default('any').notNull(),
  amenities: jsonb('amenities').$type<string[]>().default([]).notNull(),
  rules: text('rules'),
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  cityId: integer('city_id').references(() => cities.id).notNull(),
  localityId: integer('locality_id').references(() => localities.id).notNull(),
  intent: intentEnum('intent').default('rent').notNull(),
  completenessScore: integer('completeness_score').default(0).notNull(),
  status: listingStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('listings_owner_idx').on(table.ownerId),
  index('listings_status_idx').on(table.status),
  index('listings_city_id_idx').on(table.cityId),
  index('listings_locality_id_idx').on(table.localityId),
  index('listings_intent_idx').on(table.intent),
]);

export const favorites = pgTable('favorites', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  listingId: integer('listing_id').references(() => listings.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('favorites_user_listing_uniq').on(table.userId, table.listingId),
]);

export const contactLeads = pgTable('contact_leads', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  listingId: integer('listing_id').references(() => listings.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('contact_leads_user_listing_uniq').on(table.userId, table.listingId),
]);

export const reviewStatusEnum = pgEnum('review_status', ['pending', 'approved', 'rejected']);

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  listingId: integer('listing_id').references(() => listings.id, { onDelete: 'cascade' }).notNull(),
  rating: integer('rating').notNull(), // 1-5
  body: text('body').notNull(),
  status: reviewStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('reviews_user_listing_uniq').on(t.userId, t.listingId),
  index('reviews_listing_idx').on(t.listingId),
  index('reviews_status_idx').on(t.status),
]);

export const contentPages = pgTable('content_pages', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  type: contentTypeEnum('type').notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  body: text('body').notNull(),
  cityId: integer('city_id').references(() => cities.id),
  localityId: integer('locality_id').references(() => localities.id),
  isPublished: boolean('is_published').default(false).notNull(),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('content_slug_idx').on(t.slug),
  index('content_city_idx').on(t.cityId),
  index('content_type_idx').on(t.type),
]);

export const priceSnapshots = pgTable('price_snapshots', {
  id: serial('id').primaryKey(),
  localityId: integer('locality_id').references(() => localities.id, { onDelete: 'cascade' }).notNull(),
  snapshotDate: timestamp('snapshot_date').notNull(),
  avgPrice: integer('avg_price').notNull(),
  medianPrice: integer('median_price').notNull(),
  minPrice: integer('min_price').notNull(),
  maxPrice: integer('max_price').notNull(),
  sampleSize: integer('sample_size').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('snapshots_locality_date_idx').on(t.localityId, t.snapshotDate),
]);

// TypeScript types
export type LocalityNeighbor = typeof localityNeighbors.$inferSelect;
export type NewLocalityNeighbor = typeof localityNeighbors.$inferInsert;
export type City = typeof cities.$inferSelect;
export type NewCity = typeof cities.$inferInsert;
export type Locality = typeof localities.$inferSelect;
export type NewLocality = typeof localities.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;
export type ContactLead = typeof contactLeads.$inferSelect;
export type NewContactLead = typeof contactLeads.$inferInsert;
export type NewFavorite = typeof favorites.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type ContentPage = typeof contentPages.$inferSelect;
export type NewContentPage = typeof contentPages.$inferInsert;
export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type NewPriceSnapshot = typeof priceSnapshots.$inferInsert;
