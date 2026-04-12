import { Router } from 'express';
import { requireAuth, AuthRequest, getAuthPayload } from '../middleware/auth';
import { contactRevealLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../lib/asyncHandler';
import { parseIntParam } from '../lib/routeUtils';
import {
  listListings,
  getMyListings,
  getListingDetail,
  createListing,
  updateListing,
  updateListingStatus,
  deleteListing,
  revealContact,
} from '../services/ListingService';

const router = Router();

// GET /api/listings — public list with filters
router.get('/', asyncHandler(async (req, res) => {
  const payload = await listListings(req.query);
  res.json(payload);
}));

// GET /api/listings/mine — owner listing management view
router.get('/mine', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const payload = await getMyListings(req.user!.userId);
  res.json(payload);
}));

// GET /api/listings/:id — public detail
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;
  const requester = await getAuthPayload(req);
  const payload = await getListingDetail(
    id,
    requester ? { userId: requester.userId, isAdmin: requester.isAdmin } : undefined,
  );
  res.json(payload);
}));

// POST /api/listings — create (auth required)
router.post('/', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const created = await createListing(req.body, req.user!.userId);
  res.status(201).json(created);
}));

// PUT /api/listings/:id — update (owner only)
router.put('/:id', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;
  const updated = await updateListing(id, req.body, req);
  res.json(updated);
}));

// PATCH /api/listings/:id/status — change listing status
router.patch('/:id/status', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;
  const result = await updateListingStatus(id, req.body, req);
  res.json(result);
}));

// DELETE /api/listings/:id (owner or admin)
router.delete('/:id', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;
  const result = await deleteListing(id, req);
  res.json(result);
}));

// POST /api/listings/:id/contact — reveal owner phone
router.post('/:id/contact', requireAuth, contactRevealLimiter, asyncHandler(async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;
  const result = await revealContact(id, req.user!.userId, req.user!.isAdmin);
  res.json(result);
}));

export default router;
