import { Router } from 'express';
import { db } from '../db';
import { favorites, listings, cities, localities, users } from '../db/schema';
import { eq, and, desc, getTableColumns } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getTrustBadges } from '../services/completeness';
import { parseIntParam, withDisplayLocation } from '../lib/routeUtils';
import { asyncHandler } from '../lib/asyncHandler';
import { ValidationError } from '../lib/errors';

const router = Router();
const favoriteListingColumns = {
  ...getTableColumns(listings),
  city: cities.name,
  locality: localities.name,
  ownerVerified: users.isPosterVerified,
};

router.get('/', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
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
}));

router.post('/', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const { listingId } = req.body;
  if (!listingId || typeof listingId !== 'number') {
    throw new ValidationError('listingId required (number)');
  }
  await db.insert(favorites).values({ userId: req.user!.userId, listingId }).onConflictDoNothing();
  res.status(201).json({ message: 'Saved' });
}));

router.delete('/:listingId', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const listingId = parseIntParam(req, res, 'listingId');
  if (listingId === null) return;
  await db.delete(favorites).where(
    and(eq(favorites.userId, req.user!.userId), eq(favorites.listingId, listingId)),
  );
  res.json({ message: 'Removed' });
}));

export default router;
