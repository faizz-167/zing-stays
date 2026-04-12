import { Router } from 'express';
import { db } from '../db';
import { contentPages, cities, localities } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth';
import { logger } from '../lib/logger';
import { parseIntParam } from '../lib/routeUtils';
import { z } from 'zod';

const router = Router();

const contentPageSchema = z.object({
  slug: z.string().min(3).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  type: z.enum(['area_guide', 'student_guide', 'comparison', 'rent_advice', 'locality_insight']),
  title: z.string().min(5).max(300),
  body: z.string().min(10),
  cityId: z.number().int().positive().optional().nullable(),
  localityId: z.number().int().positive().optional().nullable(),
  isPublished: z.boolean().optional().default(false),
});

const updateContentPageSchema = contentPageSchema.partial();
const contentListQuerySchema = z.object({
  cityId: z.coerce.number().int().positive().optional(),
});

// ---------------------------------------------------------------------------
// Admin endpoints — declared BEFORE /:slug to prevent 'admin' matching as slug
// ---------------------------------------------------------------------------

// GET /api/content/admin — admin: list ALL pages (incl. drafts)
router.get('/admin', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const pages = await db
      .select({
        id: contentPages.id,
        slug: contentPages.slug,
        type: contentPages.type,
        title: contentPages.title,
        cityId: contentPages.cityId,
        localityId: contentPages.localityId,
        isPublished: contentPages.isPublished,
        publishedAt: contentPages.publishedAt,
        updatedAt: contentPages.updatedAt,
      })
      .from(contentPages)
      .orderBy(contentPages.updatedAt);

    res.json(pages);
  } catch (err) {
    logger.error('admin content list error', err);
    res.status(500).json({ error: 'Failed to list content pages' });
  }
});

// GET /api/content/admin/:id — admin: fetch any page by ID
router.get('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;

  try {
    const [page] = await db
      .select()
      .from(contentPages)
      .where(eq(contentPages.id, id))
      .limit(1);

    if (!page) { res.status(404).json({ error: 'Page not found' }); return; }
    res.json(page);
  } catch (err) {
    logger.error('admin content get error', err);
    res.status(500).json({ error: 'Failed to fetch content page' });
  }
});

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

// GET /api/content?cityId=X — public: list published pages for a city
router.get('/', async (req, res) => {
  const parsedQuery = contentListQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({ error: parsedQuery.error.issues[0].message });
    return;
  }

  const { cityId } = parsedQuery.data;
  try {
    const conditions = [eq(contentPages.isPublished, true)];
    if (cityId !== undefined) conditions.push(eq(contentPages.cityId, cityId));

    const pages = await db
      .select({
        id: contentPages.id,
        slug: contentPages.slug,
        type: contentPages.type,
        title: contentPages.title,
        cityId: contentPages.cityId,
        localityId: contentPages.localityId,
        publishedAt: contentPages.publishedAt,
      })
      .from(contentPages)
      .where(and(...conditions))
      .orderBy(contentPages.publishedAt);

    res.json(pages);
  } catch (err) {
    logger.error('content list error', err);
    res.status(500).json({ error: 'Failed to list content pages' });
  }
});

// GET /api/content/:slug — public: fetch published page by slug (with city/locality info)
router.get('/:slug', async (req, res) => {
  const { slug } = req.params as { slug: string };
  try {
    const [page] = await db
      .select({
        id: contentPages.id,
        slug: contentPages.slug,
        type: contentPages.type,
        title: contentPages.title,
        body: contentPages.body,
        cityId: contentPages.cityId,
        localityId: contentPages.localityId,
        isPublished: contentPages.isPublished,
        publishedAt: contentPages.publishedAt,
        cityName: cities.name,
        citySlug: cities.slug,
        localityName: localities.name,
        localitySlug: localities.slug,
      })
      .from(contentPages)
      .leftJoin(cities, eq(contentPages.cityId, cities.id))
      .leftJoin(localities, eq(contentPages.localityId, localities.id))
      .where(and(eq(contentPages.slug, slug), eq(contentPages.isPublished, true)))
      .limit(1);

    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.json(page);
  } catch (err) {
    logger.error('content get error', err);
    res.status(500).json({ error: 'Failed to fetch content page' });
  }
});

// ---------------------------------------------------------------------------
// Admin write endpoints
// ---------------------------------------------------------------------------

// POST /api/content — admin: create page
router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const result = contentPageSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  try {
    const now = new Date();
    const [page] = await db
      .insert(contentPages)
      .values({
        ...result.data,
        publishedAt: result.data.isPublished ? now : null,
      })
      .returning();
    res.status(201).json(page);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('unique')) {
      res.status(409).json({ error: 'A page with this slug already exists.' });
      return;
    }
    logger.error('content create error', err);
    res.status(500).json({ error: 'Failed to create content page' });
  }
});

// PUT /api/content/:id — admin: update page
router.put('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;

  const result = updateContentPageSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  try {
    const [existing] = await db
      .select({ isPublished: contentPages.isPublished, publishedAt: contentPages.publishedAt })
      .from(contentPages)
      .where(eq(contentPages.id, id))
      .limit(1);
    if (!existing) { res.status(404).json({ error: 'Page not found' }); return; }

    const willPublish = result.data.isPublished === true && !existing.isPublished;
    const willUnpublish = result.data.isPublished === false && existing.isPublished;
    const [page] = await db
      .update(contentPages)
      .set({
        ...result.data,
        publishedAt: willPublish ? new Date() : willUnpublish ? null : existing.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(contentPages.id, id))
      .returning();
    res.json(page);
  } catch (err) {
    logger.error('content update error', err);
    res.status(500).json({ error: 'Failed to update content page' });
  }
});

// DELETE /api/content/:id — admin: delete page
router.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const id = parseIntParam(req, res, 'id');
  if (id === null) return;
  try {
    const [existing] = await db
      .select({ id: contentPages.id })
      .from(contentPages)
      .where(eq(contentPages.id, id))
      .limit(1);
    if (!existing) { res.status(404).json({ error: 'Page not found' }); return; }
    await db.delete(contentPages).where(eq(contentPages.id, id));
    res.json({ message: 'Page deleted' });
  } catch (err) {
    logger.error('content delete error', err);
    res.status(500).json({ error: 'Failed to delete content page' });
  }
});

export default router;
