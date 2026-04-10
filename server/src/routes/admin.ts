import { Router } from 'express';
import { db } from '../db';
import { listings, cities, localities } from '../db/schema';
import { eq, desc, getTableColumns } from 'drizzle-orm';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import { searchIndexQueue } from '../lib/queues';
import { cacheInvalidate, cacheInvalidateByPrefix } from '../lib/redis';
import { logger } from '../lib/logger';
import { parseIntParam } from '../lib/routeUtils';

const router = Router();
router.use(requireAuth, requireAdmin);
const LISTINGS_LIST_CACHE_PREFIX = 'cache:listings:list:';
const LISTING_DETAIL_CACHE_PREFIX = 'cache:listings:detail:';
const adminListingColumns = {
  ...getTableColumns(listings),
  city: cities.name,
  locality: localities.name,
};

router.get('/listings', async (_req, res) => {
  try {
    const rows = await db
      .select(adminListingColumns)
      .from(listings)
      .leftJoin(cities, eq(listings.cityId, cities.id))
      .leftJoin(localities, eq(listings.localityId, localities.id))
      .orderBy(desc(listings.createdAt))
      .limit(100);
    res.json({
      data: rows.map((row) => ({
        ...row,
        city: row.city ?? '',
        locality: row.locality ?? '',
      })),
    });
  } catch (err) {
    logger.error('admin listings error', err);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

router.put('/listings/:id/status', async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;
  const { status } = req.body;
  if (!['active', 'inactive', 'draft'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' }); return;
  }
  try {
    const [updated] = await db.update(listings)
      .set({ status, updatedAt: new Date() })
      .where(eq(listings.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: 'Listing not found' }); return; }
    if (status === 'inactive') {
      searchIndexQueue.add('index-listing', { listingId: id, action: 'delete' }).catch(
        (err) => logger.error('searchIndexQueue add error', err),
      );
    } else {
      searchIndexQueue.add('index-listing', { listingId: updated.id, action: 'upsert' }).catch(
        (err) => logger.error('searchIndexQueue add error', err),
      );
    }
    await Promise.all([
      cacheInvalidate(`${LISTING_DETAIL_CACHE_PREFIX}${id}`),
      cacheInvalidateByPrefix(LISTINGS_LIST_CACHE_PREFIX),
    ]);
    res.json(updated);
  } catch (err) {
    logger.error('admin status error', err);
    res.status(500).json({ error: 'Failed to update listing status' });
  }
});

export default router;
