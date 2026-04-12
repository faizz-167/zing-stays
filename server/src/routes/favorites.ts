import { Router } from 'express';
import { db } from '../db';
import { favorites, listings, cities, localities, users } from '../db/schema';
import { eq, and, desc, getTableColumns } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getTrustBadges } from '../services/completeness';
import { logger } from '../lib/logger';
import { parseIntParam, withDisplayLocation } from '../lib/routeUtils';

const router = Router();
const favoriteListingColumns = {
  ...getTableColumns(listings),
  city: cities.name,
  locality: localities.name,
  ownerVerified: users.isPosterVerified,
};

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select(favoriteListingColumns)
      .from(favorites)
      .innerJoin(listings, eq(favorites.listingId, listings.id))
      .innerJoin(users, eq(listings.ownerId, users.id))
      .leftJoin(cities, eq(listings.cityId, cities.id))
      .leftJoin(localities, eq(listings.localityId, localities.id))
      .where(eq(favorites.userId, req.user!.userId))
      .orderBy(desc(favorites.createdAt));
    res.json({
      data: rows
        .filter((row) => row.status === 'active')
        .map((row) => ({
          ...withDisplayLocation(row),
          badges: getTrustBadges(row),
        })),
    });
  } catch (err) {
    logger.error('favorites list error', err);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { listingId } = req.body;
  if (!listingId || typeof listingId !== 'number') {
    res.status(400).json({ error: 'listingId required (number)' }); return;
  }
  try {
    await db.insert(favorites).values({ userId: req.user!.userId, listingId }).onConflictDoNothing();
    res.status(201).json({ message: 'Saved' });
  } catch (err) {
    logger.error('favorites add error', err);
    res.status(500).json({ error: 'Failed to save favorite' });
  }
});

router.delete('/:listingId', requireAuth, async (req: AuthRequest, res) => {
  const listingId = parseIntParam(req, res, 'listingId');
  if (listingId === null) return;
  try {
    await db.delete(favorites).where(
      and(eq(favorites.userId, req.user!.userId), eq(favorites.listingId, listingId)),
    );
    res.json({ message: 'Removed' });
  } catch (err) {
    logger.error('favorites remove error', err);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

export default router;
