import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as schema from '../src/db/schema';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seed() {
  // Seed cities
  const [bangalore, hyderabad] = await db.insert(schema.cities).values([
    { name: 'Bangalore', slug: 'bangalore', state: 'Karnataka', isActive: true },
    { name: 'Hyderabad', slug: 'hyderabad', state: 'Telangana', isActive: true },
  ]).returning();

  console.log('Seeded cities:', bangalore.name, hyderabad.name);

  // Seed localities for Bangalore
  const bangaloreLocalities = await db.insert(schema.localities).values([
    { cityId: bangalore.id, name: 'Koramangala', slug: 'koramangala', isActive: true },
    { cityId: bangalore.id, name: 'Indiranagar', slug: 'indiranagar', isActive: true },
    { cityId: bangalore.id, name: 'HSR Layout', slug: 'hsr-layout', isActive: true },
    { cityId: bangalore.id, name: 'Whitefield', slug: 'whitefield', isActive: true },
    { cityId: bangalore.id, name: 'Electronic City', slug: 'electronic-city', isActive: true },
  ]).returning();

  // Seed localities for Hyderabad
  const hyderabadLocalities = await db.insert(schema.localities).values([
    { cityId: hyderabad.id, name: 'Hitech City', slug: 'hitech-city', isActive: true },
    { cityId: hyderabad.id, name: 'Gachibowli', slug: 'gachibowli', isActive: true },
    { cityId: hyderabad.id, name: 'Kondapur', slug: 'kondapur', isActive: true },
    { cityId: hyderabad.id, name: 'Banjara Hills', slug: 'banjara-hills', isActive: true },
  ]).returning();

  console.log('Seeded localities for Bangalore and Hyderabad');

  // Seed nearby locality relations (within same city)
  await db.insert(schema.localityNeighbors).values([
    // Bangalore neighbors
    { localityId: bangaloreLocalities[0].id, neighborId: bangaloreLocalities[1].id },
    { localityId: bangaloreLocalities[0].id, neighborId: bangaloreLocalities[2].id },
    { localityId: bangaloreLocalities[1].id, neighborId: bangaloreLocalities[0].id },
    { localityId: bangaloreLocalities[1].id, neighborId: bangaloreLocalities[2].id },
    { localityId: bangaloreLocalities[2].id, neighborId: bangaloreLocalities[0].id },
    { localityId: bangaloreLocalities[2].id, neighborId: bangaloreLocalities[1].id },
    // Hyderabad neighbors
    { localityId: hyderabadLocalities[0].id, neighborId: hyderabadLocalities[1].id },
    { localityId: hyderabadLocalities[1].id, neighborId: hyderabadLocalities[0].id },
    { localityId: hyderabadLocalities[1].id, neighborId: hyderabadLocalities[2].id },
    { localityId: hyderabadLocalities[2].id, neighborId: hyderabadLocalities[1].id },
  ]);

  console.log('Seeded locality neighbors');

  // Seed admin user
  const [admin] = await db.insert(schema.users).values({
    email: 'admin@zingbrokers.com',
    name: 'Admin',
    isAdmin: true,
  }).returning();

  console.log('Seeded admin user:', admin.email);
  console.log('Seed complete');

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
