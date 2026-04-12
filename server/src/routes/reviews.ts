import { Router } from 'express';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth';
import { reviewPostLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../lib/asyncHandler';
import { parseIntParam } from '../lib/routeUtils';
import {
  submitReview,
  getApprovedReviews,
  getAdminReviews,
  updateReviewStatus,
} from '../services/ReviewService';

const router = Router();

// POST /api/reviews — contact-gated, auth required
router.post('/', requireAuth, reviewPostLimiter, asyncHandler(async (req: AuthRequest, res) => {
  const { review, status } = await submitReview(req.body, req.user!.userId);
  res.status(status).json(review);
}));

// GET /api/reviews/admin — admin: list reviews by status
router.get('/admin', requireAuth, requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const status = (req.query.status as string) ?? 'pending';
  const rows = await getAdminReviews(status);
  res.json(rows);
}));

// GET /api/reviews/:listingId — public, only approved reviews
router.get('/:listingId', asyncHandler(async (req, res) => {
  const listingId = parseIntParam(req, res, 'listingId');
  if (listingId === null) return;
  const reviews = await getApprovedReviews(listingId);
  res.json(reviews);
}));

// PATCH /api/reviews/:id — admin: update review status
router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;
  const updated = await updateReviewStatus(id, req.body);
  res.json(updated);
}));

export default router;
