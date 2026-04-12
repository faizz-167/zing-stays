import { db } from '../db';
import { reviews, contactLeads, users, listings } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { moderationQueue } from '../lib/queues';
import { logger } from '../lib/logger';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../lib/errors';
import { z } from 'zod';

const createReviewSchema = z.object({
  listingId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(20),
});

const adminStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export async function submitReview(body: unknown, userId: number) {
  const result = createReviewSchema.safeParse(body);
  if (!result.success) throw new ValidationError(result.error.issues[0].message);

  const { listingId, rating, body: reviewBody } = result.data;

  // Gate: user must have contacted the owner first
  const [lead] = await db
    .select({ id: contactLeads.id })
    .from(contactLeads)
    .where(and(eq(contactLeads.userId, userId), eq(contactLeads.listingId, listingId)))
    .limit(1);
  if (!lead) throw new ForbiddenError('You must contact the owner before reviewing.');

  // Block owner self-review
  const [listing] = await db
    .select({ ownerId: listings.ownerId })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!listing) throw new NotFoundError('Listing not found.');
  if (listing.ownerId === userId) throw new ForbiddenError('Owners cannot review their own listing.');

  try {
    const [review] = await db
      .insert(reviews)
      .values({ userId, listingId, rating, body: reviewBody, status: 'pending' })
      .returning();

    try {
      await moderationQueue.add('moderate-review', { reviewId: review.id });
      return { review, status: 201 };
    } catch (queueErr) {
      logger.error('moderationQueue add error', queueErr);
      return { review: { ...review, queued: false }, status: 202 };
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('unique')) {
      throw new ConflictError('You have already reviewed this listing.');
    }
    throw err;
  }
}

export async function getApprovedReviews(listingId: number) {
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

  return rows.map((r) => ({
    ...r,
    userName: r.userName ? r.userName.split(' ')[0] : 'Anonymous',
  }));
}

export async function getAdminReviews(status: string) {
  const validStatuses = ['pending', 'approved', 'rejected'] as const;
  if (!validStatuses.includes(status as typeof validStatuses[number])) {
    throw new ValidationError('Invalid status filter');
  }

  return db
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
}

export async function updateReviewStatus(id: number, body: unknown) {
  const result = adminStatusSchema.safeParse(body);
  if (!result.success) throw new ValidationError(result.error.issues[0].message);

  const [updated] = await db
    .update(reviews)
    .set({ status: result.data.status })
    .where(eq(reviews.id, id))
    .returning();
  if (!updated) throw new NotFoundError('Review not found');
  return updated;
}
