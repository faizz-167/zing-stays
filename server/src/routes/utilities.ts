import { Router } from 'express';
import { db } from '../db';
import { listings, localities, priceSnapshots } from '../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { cacheGet, cacheSet } from '../lib/redis';
import { roomTypeValues } from '../lib/listingFields';
import { logger } from '../lib/logger';
import { parseIntParam } from '../lib/routeUtils';

const router = Router();

// GET /api/utilities/rent-estimate/:localityId
router.get('/rent-estimate/:localityId', async (req, res) => {
  const localityId = parseIntParam(req, res, 'localityId');
  if (localityId === null) return;

  const cacheKey = `util:rent-est:${localityId}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const [locality] = await db
      .select({ id: localities.id, name: localities.name })
      .from(localities)
      .where(eq(localities.id, localityId))
      .limit(1);

    if (!locality) {
      res.status(404).json({ error: 'Locality not found' });
      return;
    }

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

    function computeStats(prices: number[]) {
      if (prices.length === 0) return null;
      const sorted = [...prices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median =
        sorted.length % 2 === 0
          ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
          : sorted[mid];
      return {
        median,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        count: sorted.length,
      };
    }

    const byRoomType = Object.fromEntries(
      roomTypeValues.map((roomType) => [
        roomType,
        computeStats(rows.filter((r) => r.roomType === roomType).map((r) => r.price)),
      ]),
    ) as Record<(typeof roomTypeValues)[number], ReturnType<typeof computeStats>>;

    const sampleSize = allPrices.length;
    const confidence: 'high' | 'medium' | 'low' =
      sampleSize >= 10 ? 'high' : sampleSize >= 5 ? 'medium' : 'low';

    const overall = computeStats(allPrices);
    if (!overall) {
      res.json({
        localityId,
        localityName: locality.name,
        overall: null,
        byRoomType,
        confidence: 'low',
      });
      return;
    }

    const payload = {
      localityId,
      localityName: locality.name,
      overall: { median: overall.median, min: overall.min, max: overall.max, sampleSize },
      byRoomType,
      confidence,
    };

    await cacheSet(cacheKey, payload, 6 * 60 * 60);
    res.json(payload);
  } catch (err) {
    logger.error('rent-estimate error', err);
    res.status(500).json({ error: 'Failed to compute rent estimate' });
  }
});

// GET /api/utilities/price-trends/:localityId
router.get('/price-trends/:localityId', async (req, res) => {
  const localityId = parseIntParam(req, res, 'localityId');
  if (localityId === null) return;

  const cacheKey = `util:trends:${localityId}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const [locality] = await db
      .select({ id: localities.id })
      .from(localities)
      .where(eq(localities.id, localityId))
      .limit(1);

    if (!locality) {
      res.status(404).json({ error: 'Locality not found' });
      return;
    }

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
    await cacheSet(cacheKey, payload, 6 * 60 * 60);
    res.json(payload);
  } catch (err) {
    logger.error('price-trends error', err);
    res.status(500).json({ error: 'Failed to compute price trends' });
  }
});

export default router;
