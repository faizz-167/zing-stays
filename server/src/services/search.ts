import { Meilisearch } from 'meilisearch';
import { db } from '../db';
import { listings, cities, localities } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../lib/logger';

export const searchClient = new Meilisearch({
  host: process.env.MEILISEARCH_HOST!,
  apiKey: process.env.MEILISEARCH_API_KEY,
});

export const listingsIndex = searchClient.index('listings');

function isIndexNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  if ('code' in err && err.code === 'index_not_found') {
    return true;
  }

  if ('cause' in err && err.cause && typeof err.cause === 'object' && 'code' in err.cause) {
    return err.cause.code === 'index_not_found';
  }

  return false;
}

async function ensureListingsIndexExists(): Promise<void> {
  try {
    const index = await searchClient.getIndex('listings');
    if (index.primaryKey === 'id') {
      return;
    }

    const deleteTask = await searchClient.deleteIndex('listings');
    await searchClient.tasks.waitForTask(deleteTask.taskUid, { timeout: 30_000 });

    const createTask = await searchClient.createIndex('listings', { primaryKey: 'id' });
    await searchClient.tasks.waitForTask(createTask.taskUid, { timeout: 30_000 });
  } catch (err) {
    if (!isIndexNotFoundError(err)) {
      throw err;
    }

    const createTask = await searchClient.createIndex('listings', { primaryKey: 'id' });
    await searchClient.tasks.waitForTask(createTask.taskUid, { timeout: 30_000 });
  }
}

export async function setupSearchIndex(): Promise<void> {
  await ensureListingsIndexExists();

  const task = await listingsIndex.updateSettings({
    searchableAttributes: ['title', 'landmark', 'locality', 'city', 'description', 'amenities'],
    filterableAttributes: [
      'city', 'locality', 'city_id', 'locality_id', 'intent',
      'room_type', 'property_type', 'food_included', 'gender_pref', 'price', 'status',
      'furnishing', 'preferred_tenants', 'available_from_ts',
    ],
    sortableAttributes: ['price', 'completeness_score', 'created_at'],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'completeness_score:desc',
      'created_at:desc',
    ],
  });
  // Wait for settings to be applied before indexing documents.
  await searchClient.tasks.waitForTask(task.taskUid, { timeout: 30_000 });
}

export interface SearchDoc {
  id: number;
  owner_id: number;
  title: string;
  description?: string;
  city: string;
  locality: string;
  city_slug: string;
  locality_slug: string;
  city_id?: number;
  locality_id?: number;
  intent?: string;
  landmark?: string;
  price: number;
  deposit?: number;
  area_sqft?: number;
  room_type: string;
  property_type: string;
  food_included: boolean;
  gender_pref: string;
  furnishing?: string;
  preferred_tenants: string;
  /** Unix timestamp (seconds). 0 means available immediately (no date set). */
  available_from_ts: number;
  images: string[];
  completeness_score: number;
  status: string;
  created_at: string;
}

export async function indexListing(doc: SearchDoc): Promise<void> {
  await ensureListingsIndexExists();
  const task = await listingsIndex.addDocuments([doc]);
  await searchClient.tasks.waitForTask(task.taskUid, { timeout: 30_000 });
}

export async function removeListing(id: number): Promise<void> {
  await ensureListingsIndexExists();
  const task = await listingsIndex.deleteDocument(id);
  await searchClient.tasks.waitForTask(task.taskUid, { timeout: 30_000 });
}

async function fetchSearchDocs(whereClause?: ReturnType<typeof eq>): Promise<SearchDoc[]> {
  const query = db
    .select({
      id: listings.id,
      owner_id: listings.ownerId,
      title: listings.title,
      description: listings.description,
      city: cities.name,
      locality: localities.name,
      city_slug: cities.slug,
      locality_slug: localities.slug,
      city_id: listings.cityId,
      locality_id: listings.localityId,
      intent: listings.intent,
      landmark: listings.landmark,
      price: listings.price,
      deposit: listings.deposit,
      area_sqft: listings.areaSqft,
      room_type: listings.roomType,
      property_type: listings.propertyType,
      food_included: listings.foodIncluded,
      gender_pref: listings.genderPref,
      furnishing: listings.furnishing,
      preferred_tenants: listings.preferredTenants,
      available_from: listings.availableFrom,
      images: listings.images,
      completeness_score: listings.completenessScore,
      status: listings.status,
      created_at: listings.createdAt,
    })
    .from(listings)
    .innerJoin(cities, eq(listings.cityId, cities.id))
    .innerJoin(localities, eq(listings.localityId, localities.id));

  const rows = whereClause ? await query.where(whereClause) : await query;

  return rows.map((row) => ({
    id: row.id,
    owner_id: row.owner_id,
    title: row.title,
    description: row.description ?? undefined,
    city: row.city,
    locality: row.locality,
    city_slug: row.city_slug,
    locality_slug: row.locality_slug,
    city_id: row.city_id ?? undefined,
    locality_id: row.locality_id ?? undefined,
    intent: row.intent,
    landmark: row.landmark ?? undefined,
    price: row.price,
    deposit: row.deposit ?? undefined,
    area_sqft: row.area_sqft ?? undefined,
    room_type: row.room_type,
    property_type: row.property_type,
    food_included: row.food_included,
    gender_pref: row.gender_pref,
    furnishing: row.furnishing ?? undefined,
    preferred_tenants: row.preferred_tenants,
    available_from_ts: row.available_from
      ? Math.floor(new Date(row.available_from).getTime() / 1000)
      : 0,
    images: row.images as string[],
    completeness_score: row.completeness_score,
    status: row.status,
    created_at: row.created_at.toISOString(),
  }));
}

export async function getSearchDocByListingId(listingId: number): Promise<SearchDoc | null> {
  const [doc] = await fetchSearchDocs(eq(listings.id, listingId));
  return doc ?? null;
}

/** Re-index all active listings. Called once on server boot via the search index worker. */
export async function reindexAllListings(): Promise<void> {
  await ensureListingsIndexExists();

  const docs = await fetchSearchDocs(eq(listings.status, 'active'));

  const deleteTask = await listingsIndex.deleteAllDocuments();
  await searchClient.tasks.waitForTask(deleteTask.taskUid, { timeout: 30_000 });

  if (docs.length === 0) {
    logger.info('reindexAllListings: cleared index; no active listings found');
    return;
  }

  // Meilisearch supports up to 1000 docs per batch
  const BATCH = 500;
  for (let i = 0; i < docs.length; i += BATCH) {
    const task = await listingsIndex.addDocuments(docs.slice(i, i + BATCH));
    await searchClient.tasks.waitForTask(task.taskUid, { timeout: 30_000 });
  }
  logger.info(`reindexAllListings: indexed ${docs.length} documents`);
}
