import 'dotenv/config';
import { db } from '../db';
import { listings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { indexListing } from '../services/search';

async function main() {
  console.log('Re-indexing all active listings with new fields...');

  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.status, 'active'));

  let indexed = 0;
  for (const listing of rows) {
    await indexListing({
      id: listing.id,
      title: listing.title,
      description: listing.description ?? undefined,
      city: listing.city,
      locality: listing.locality,
      city_id: listing.cityId ?? undefined,
      locality_id: listing.localityId ?? undefined,
      intent: listing.intent,
      landmark: listing.landmark ?? undefined,
      price: listing.price,
      room_type: listing.roomType,
      property_type: listing.propertyType,
      food_included: listing.foodIncluded,
      gender_pref: listing.genderPref,
      images: listing.images as string[],
      completeness_score: listing.completenessScore,
      status: listing.status,
      created_at: listing.createdAt.toISOString(),
    });
    indexed++;
  }

  console.log(`Re-indexed ${indexed} listings.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Re-index failed:', err);
    process.exit(1);
  });
