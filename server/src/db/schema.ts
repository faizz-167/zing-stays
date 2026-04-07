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

export const roomTypeEnum = pgEnum('room_type', ['single', 'double', 'shared']);
export const propertyTypeEnum = pgEnum('property_type', ['pg', 'hostel', 'apartment', 'flat']);
export const genderPrefEnum = pgEnum('gender_pref', ['male', 'female', 'any']);
export const listingStatusEnum = pgEnum('listing_status', ['draft', 'active', 'inactive']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const otpSessions = pgTable('otp_sessions', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 20 }).notNull(),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('otp_phone_idx').on(table.phone),
  index('otp_expires_idx').on(table.expiresAt),
]);

export const listings = pgTable('listings', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  city: varchar('city', { length: 100 }).notNull(),
  locality: varchar('locality', { length: 100 }).notNull(),
  landmark: varchar('landmark', { length: 200 }),
  address: text('address'),
  price: integer('price').notNull(),
  roomType: roomTypeEnum('room_type').notNull(),
  propertyType: propertyTypeEnum('property_type').notNull(),
  foodIncluded: boolean('food_included').default(false).notNull(),
  genderPref: genderPrefEnum('gender_pref').default('any').notNull(),
  amenities: jsonb('amenities').$type<string[]>().default([]).notNull(),
  rules: text('rules'),
  images: jsonb('images').$type<string[]>().default([]).notNull(),
  completenessScore: integer('completeness_score').default(0).notNull(),
  status: listingStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('listings_city_idx').on(table.city),
  index('listings_owner_idx').on(table.ownerId),
  index('listings_status_idx').on(table.status),
  index('listings_city_status_idx').on(table.city, table.status),
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

// TypeScript types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;
export type ContactLead = typeof contactLeads.$inferSelect;
export type NewContactLead = typeof contactLeads.$inferInsert;
export type NewFavorite = typeof favorites.$inferInsert;
