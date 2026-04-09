import 'dotenv/config';
import { db } from '../db';
import { cities, localities, listings } from '../db/schema';
import { eq, isNull, sql } from 'drizzle-orm';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const SEED_CITIES = [
  { name: 'Bangalore', slug: 'bangalore', state: 'Karnataka' },
  { name: 'Chennai', slug: 'chennai', state: 'Tamil Nadu' },
  { name: 'Mumbai', slug: 'mumbai', state: 'Maharashtra' },
  { name: 'Delhi', slug: 'delhi', state: 'Delhi' },
  { name: 'Hyderabad', slug: 'hyderabad', state: 'Telangana' },
  { name: 'Pune', slug: 'pune', state: 'Maharashtra' },
  { name: 'Coimbatore', slug: 'coimbatore', state: 'Tamil Nadu' },
  { name: 'Kolkata', slug: 'kolkata', state: 'West Bengal' },
];

async function main() {
  console.log('Starting location backfill...');

  // 1. Seed known cities
  for (const city of SEED_CITIES) {
    await db.insert(cities).values(city).onConflictDoNothing();
  }
  console.log('Seeded base cities.');

  // 2. Pull distinct city names from listings
  const distinctCities = await db
    .selectDistinct({ city: listings.city })
    .from(listings);

  const cityMap = new Map<string, number>();

  for (const { city: rawCity } of distinctCities) {
    if (!rawCity) continue;
    const slug = toSlug(rawCity);

    // Upsert city
    await db
      .insert(cities)
      .values({ name: rawCity, slug })
      .onConflictDoNothing();

    const [cityRow] = await db
      .select({ id: cities.id })
      .from(cities)
      .where(eq(cities.slug, slug))
      .limit(1);

    if (cityRow) cityMap.set(rawCity.toLowerCase(), cityRow.id);
  }
  console.log(`Processed ${cityMap.size} cities.`);

  // 3. Pull distinct (city, locality) pairs from listings
  const distinctLocalities = await db
    .selectDistinct({ city: listings.city, locality: listings.locality })
    .from(listings);

  const localityMap = new Map<string, number>();

  for (const { city: rawCity, locality: rawLocality } of distinctLocalities) {
    if (!rawCity || !rawLocality) continue;
    const cityId = cityMap.get(rawCity.toLowerCase());
    if (!cityId) continue;

    const slug = toSlug(rawLocality);
    const key = `${rawCity.toLowerCase()}::${rawLocality.toLowerCase()}`;

    await db
      .insert(localities)
      .values({ cityId, name: rawLocality, slug })
      .onConflictDoNothing();

    const [localityRow] = await db
      .select({ id: localities.id })
      .from(localities)
      .where(
        sql`${localities.cityId} = ${cityId} AND ${localities.slug} = ${slug}`
      )
      .limit(1);

    if (localityRow) localityMap.set(key, localityRow.id);
  }
  console.log(`Processed ${localityMap.size} localities.`);

  // 4. Backfill city_id and locality_id on listings
  const allListings = await db
    .select({ id: listings.id, city: listings.city, locality: listings.locality })
    .from(listings)
    .where(isNull(listings.cityId));

  let updated = 0;
  let skipped = 0;

  for (const listing of allListings) {
    const cityId = cityMap.get(listing.city?.toLowerCase() ?? '');
    const localityKey = `${listing.city?.toLowerCase() ?? ''}::${listing.locality?.toLowerCase() ?? ''}`;
    const localityId = localityMap.get(localityKey);

    if (!cityId || !localityId) {
      console.warn(`  Skipping listing ${listing.id}: city="${listing.city}" locality="${listing.locality}"`);
      skipped++;
      continue;
    }

    await db
      .update(listings)
      .set({ cityId, localityId })
      .where(eq(listings.id, listing.id));

    updated++;
  }

  console.log(`\nBackfill complete:`);
  console.log(`  Updated: ${updated} listings`);
  console.log(`  Skipped: ${skipped} listings`);
  console.log(`  Cities:  ${cityMap.size}`);
  console.log(`  Localities: ${localityMap.size}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
