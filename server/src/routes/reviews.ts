import { Router } from 'express';
import { db } from '../db';
import { reviews, contactLeads, users, listings } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth';
import { reviewPostLimiter } from '../middleware/rateLimit';
import { moderationQueue } from '../lib/queues';
import { logger } from '../lib/logger';
import { parseIntParam } from '../lib/routeUtils';
import { z } from 'zod';

const router = Router();

const createReviewSchema = z.object({
  listingId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(20),
});

// POST /api/reviews — contact-gated, auth required
router.post('/', requireAuth, reviewPostLimiter, async (req: AuthRequest, res) => {
  const result = createReviewSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }

  const { listingId, rating, body } = result.data;
  const userId = req.user!.userId;

  try {
    // Gate: user must have contacted the owner first
    const [lead] = await db
      .select({ id: contactLeads.id })
      .from(contactLeads)
      .where(and(eq(contactLeads.userId, userId), eq(contactLeads.listingId, listingId)))
      .limit(1);

    if (!lead) {
      res.status(403).json({ error: 'You must contact the owner before reviewing.' });
      return;
    }

    // Block owner self-review
    const [listing] = await db
      .select({ ownerId: listings.ownerId })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    if (listing.ownerId === userId) {
      res.status(403).json({ error: 'Owners cannot review their own listing.' });
      return;
    }

    const [review] = await db
      .insert(reviews)
      .values({ userId, listingId, rating, body, status: 'pending' })
      .returning();

    try {
      await moderationQueue.add('moderate-review', { reviewId: review.id });
      res.status(201).json(review);
    } catch (queueErr) {
      logger.error('moderationQueue add error', queueErr);
      res.status(202).json({ ...review, queued: false });
    }
  } catch (err: unknown) {
    // Unique constraint violation = duplicate review
    if (err instanceof Error && err.message.includes('unique')) {
      res.status(409).json({ error: 'You have already reviewed this listing.' });
      return;
    }
    logger.error('create review error', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// GET /api/reviews/admin — admin: list reviews by status
// NOTE: must be declared before /:listingId to avoid /admin being captured as a listingId
router.get('/admin', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const status = (req.query.status as string) ?? 'pending';
  const validStatuses = ['pending', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid status filter' }); return;
  }

  try {
    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        body: reviews.body,
        status: reviews.status,
        createdAt: reviews.createdAt,
        userName: users.name,
        listingId: reviews.listingId,
        listingTitle: listings.title,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .innerJoin(listings, eq(reviews.listingId, listings.id))
      .where(eq(reviews.status, status as 'pending' | 'approved' | 'rejected'))
      .orderBy(reviews.createdAt);
    res.json(rows);
  } catch (err) {
    logger.error('admin get reviews error', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /api/reviews/:listingId — public, only approved reviews
router.get('/:listingId', async (req, res) => {
  const listingId = parseIntParam(req, res, 'listingId');
  if (listingId === null) return;

  try {
    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        body: reviews.body,
        createdAt: reviews.createdAt,
        userName: users.name,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(and(eq(reviews.listingId, listingId), eq(reviews.status, 'approved')))
      .orderBy(reviews.createdAt);

    const sanitized = rows.map((r) => ({
      ...r,
      userName: r.userName ? r.userName.split(' ')[0] : 'Anonymous',
    }));

    res.json(sanitized);
  } catch (err) {
    logger.error('get reviews error', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// PATCH /api/reviews/:id — admin: update review status
router.patch('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;

  const statusSchema = z.object({ status: z.enum(['approved', 'rejected']) });
  const result = statusSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message }); return;
  }

  try {
    const [updated] = await db
      .update(reviews)
      .set({ status: result.data.status })
      .where(eq(reviews.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: 'Review not found' }); return; }
    res.json(updated);
  } catch (err) {
    logger.error('patch review error', err);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

export default router;
