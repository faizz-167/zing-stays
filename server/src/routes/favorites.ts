import { Router } from 'express';
import { db } from '../db';
import { favorites, listings } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select({ listing: listings })
      .from(favorites)
      .innerJoin(listings, eq(favorites.listingId, listings.id))
      .where(eq(favorites.userId, req.user!.userId));
    res.json({ data: rows.map(r => r.listing) });
  } catch (err) {
    console.error('favorites list error:', err);
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
    console.error('favorites add error:', err);
    res.status(500).json({ error: 'Failed to save favorite' });
  }
});

router.delete('/:listingId', requireAuth, async (req: AuthRequest, res) => {
  const listingId = parseInt(String(req.params.listingId), 10);
  if (isNaN(listingId)) { res.status(400).json({ error: 'Invalid listing ID' }); return; }
  try {
    await db.delete(favorites).where(
      and(eq(favorites.userId, req.user!.userId), eq(favorites.listingId, listingId)),
    );
    res.json({ message: 'Removed' });
  } catch (err) {
    console.error('favorites remove error:', err);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

export default router;
