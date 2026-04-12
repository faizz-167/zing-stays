import { db } from '../db';
import { listings, localities, priceSnapshots } from '../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { cacheGet, cacheSet } from '../lib/redis';
import { roomTypeValues } from '../lib/listingFields';
import { computePriceStats } from '../lib/stats';
import { NotFoundError } from '../lib/errors';

const RENT_ESTIMATE_CACHE_TTL = 6 * 60 * 60;
const PRICE_TRENDS_CACHE_TTL = 6 * 60 * 60;

export async function getRentEstimate(localityId: number) {
  const cacheKey = `util:rent-est:${localityId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const [locality] = await db
    .select({ id: localities.id, name: localities.name })
    .from(localities)
    .where(eq(localities.id, localityId))
    .limit(1);
  if (!locality) throw new NotFoundError('Locality not found');

  const rows = await db
    .select({ price: listings.price, roomType: listings.roomType })
    .from(listings)
    .where(
      and(
        eq(listings.localityId, localityId),
        eq(listings.status, 'active'),
        eq(listings.intent, 'rent'),
      ),
    );

  const allPrices = rows.map((r) => r.price).sort((a, b) => a - b);
  const byRoomType = Object.fromEntries(
    roomTypeValues.map((roomType) => [
      roomType,
      computePriceStats(rows.filter((r) => r.roomType === roomType).map((r) => r.price)),
    ]),
  ) as Record<(typeof roomTypeValues)[number], ReturnType<typeof computePriceStats>>;

  const sampleSize = allPrices.length;
  const confidence: 'high' | 'medium' | 'low' =
    sampleSize >= 10 ? 'high' : sampleSize >= 5 ? 'medium' : 'low';

  const overall = computePriceStats(allPrices);
  if (!overall) {
    return { localityId, localityName: locality.name, overall: null, byRoomType, confidence: 'low' as const };
  }

  const payload = {
    localityId,
    localityName: locality.name,
    overall: { median: overall.median, min: overall.min, max: overall.max, sampleSize },
    byRoomType,
    confidence,
  };

  await cacheSet(cacheKey, payload, RENT_ESTIMATE_CACHE_TTL);
  return payload;
}

export async function getPriceTrends(localityId: number) {
  const cacheKey = `util:trends:${localityId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const [locality] = await db
    .select({ id: localities.id })
    .from(localities)
    .where(eq(localities.id, localityId))
    .limit(1);
  if (!locality) throw new NotFoundError('Locality not found');

  // Prefer real historical snapshots; fall back to synthetic if none exist
  const snapshots = await db
    .select({
      month: sql<string>`TO_CHAR(DATE_TRUNC('month', snapshot_date), 'YYYY-MM')`,
      avgPrice: priceSnapshots.avgPrice,
      count: priceSnapshots.sampleSize,
    })
    .from(priceSnapshots)
    .where(eq(priceSnapshots.localityId, localityId))
    .orderBy(desc(priceSnapshots.snapshotDate))
    .limit(12);

  let trend: { month: string; avgPrice: number; count: number }[];
  let dataType: 'historical' | 'synthetic';

  if (snapshots.length > 0) {
    trend = snapshots.reverse();
    dataType = 'historical';
  } else {
    const rows = await db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
        ROUND(AVG(price)) AS avg_price,
        COUNT(*)::int AS count
      FROM listings
      WHERE locality_id = ${localityId}
        AND status = 'active'
        AND intent = 'rent'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
      LIMIT 12
    `);
    trend = (rows.rows as Array<{ month: string; avg_price: string; count: number }>).map((r) => ({
      month: r.month,
      avgPrice: parseInt(r.avg_price, 10),
      count: r.count,
    }));
    dataType = 'synthetic';
  }

  let direction: 'rising' | 'falling' | 'stable' = 'stable';
  if (trend.length >= 2) {
    const first = trend[0].avgPrice;
    const last = trend[trend.length - 1].avgPrice;
    const change = ((last - first) / first) * 100;
    if (change > 5) direction = 'rising';
    else if (change < -5) direction = 'falling';
  }

  const payload = { localityId, dataType, trend, direction };
  await cacheSet(cacheKey, payload, PRICE_TRENDS_CACHE_TTL);
  return payload;
}
