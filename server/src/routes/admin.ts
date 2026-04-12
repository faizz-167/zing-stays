import { Router } from 'express';
import { db } from '../db';
import { listings, cities, localities } from '../db/schema';
import { eq, desc, getTableColumns } from 'drizzle-orm';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import { searchIndexQueue } from '../lib/queues';
import { logger } from '../lib/logger';
import { parseIntParam, withDisplayLocation } from '../lib/routeUtils';
import { invalidateListingCaches } from '../lib/listingCache';
import { asyncHandler } from '../lib/asyncHandler';
import { ValidationError, NotFoundError } from '../lib/errors';

const router = Router();
router.use(requireAuth, requireAdmin);

const adminListingColumns = {
  ...getTableColumns(listings),
  city: cities.name,
  locality: localities.name,
};

router.get('/listings', asyncHandler(async (_req, res) => {
  const rows = await db
    .select(adminListingColumns)
    .from(listings)
    .leftJoin(cities, eq(listings.cityId, cities.id))
    .leftJoin(localities, eq(listings.localityId, localities.id))
    .orderBy(desc(listings.createdAt))
    .limit(100);
  res.json({ data: rows.map(withDisplayLocation) });
}));

router.put('/listings/:id/status', asyncHandler(async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;

  const { status } = req.body;
  if (!['active', 'inactive', 'draft'].includes(status)) {
    throw new ValidationError('Invalid status');
  }

  const [updated] = await db.update(listings)
    .set({ status, updatedAt: new Date() })
    .where(eq(listings.id, id))
    .returning();
  if (!updated) throw new NotFoundError('Listing not found');

  const action = status === 'inactive' ? 'delete' : 'upsert';
  searchIndexQueue.add('index-listing', { listingId: id, action }).catch(
    (err) => logger.error('searchIndexQueue add error', err),
  );
  await invalidateListingCaches(id);
  res.json(updated);
}));

export default router;
