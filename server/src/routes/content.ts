import { Router } from 'express';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../lib/asyncHandler';
import { parseIntParam } from '../lib/routeUtils';
import {
  listAllPages,
  getPageById,
  createPage,
  updatePage,
  deletePage,
  listPublishedPages,
  getPublishedPageBySlug,
} from '../services/ContentService';

const router = Router();

// ---------------------------------------------------------------------------
// Admin endpoints — declared BEFORE /:slug to prevent 'admin' matching as slug
// ---------------------------------------------------------------------------

// GET /api/content/admin — admin: list ALL pages (incl. drafts)
router.get('/admin', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const pages = await listAllPages();
  res.json(pages);
}));

// GET /api/content/admin/:id — admin: fetch any page by ID
router.get('/admin/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;
  const page = await getPageById(id);
  res.json(page);
}));

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

// GET /api/content?cityId=X — public: list published pages for a city
router.get('/', asyncHandler(async (req, res) => {
  const pages = await listPublishedPages(req.query);
  res.json(pages);
}));

// GET /api/content/:slug — public: fetch published page by slug
router.get('/:slug', asyncHandler(async (req, res) => {
  const page = await getPublishedPageBySlug(req.params.slug as string);
  res.json(page);
}));

// ---------------------------------------------------------------------------
// Admin write endpoints
// ---------------------------------------------------------------------------

// POST /api/content — admin: create page
router.post('/', requireAuth, requireAdmin, asyncHandler(async (_req: AuthRequest, res) => {
  const page = await createPage(_req.body);
  res.status(201).json(page);
}));

// PUT /api/content/:id — admin: update page
router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;
  const page = await updatePage(id, req.body);
  res.json(page);
}));

// DELETE /api/content/:id — admin: delete page
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;
  const result = await deletePage(id);
  res.json(result);
}));

export default router;
