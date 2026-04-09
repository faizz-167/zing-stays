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
import { sql } from 'drizzle-orm';

export const intentEnum = pgEnum('intent', ['buy', 'rent']);
export const roomTypeEnum = pgEnum('room_type', ['single', 'double', 'shared']);
export const propertyTypeEnum = pgEnum('property_type', ['pg', 'hostel', 'apartment', 'flat']);
export const genderPrefEnum = pgEnum('gender_pref', ['male', 'female', 'any']);
export const listingStatusEnum = pgEnum('listing_status', ['draft', 'active', 'inactive']);

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
  cityId: integer('city_id').references(() => cities.id).default(sql`NULL`),
  localityId: integer('locality_id').references(() => localities.id).default(sql`NULL`),
  intent: intentEnum('intent').default('rent').notNull(),
  completenessScore: integer('completeness_score').default(0).notNull(),
  status: listingStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('listings_city_idx').on(table.city),
  index('listings_owner_idx').on(table.ownerId),
  index('listings_status_idx').on(table.status),
  index('listings_city_status_idx').on(table.city, table.status),
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

// TypeScript types
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
