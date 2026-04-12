import { db } from '../db';
import { contentPages, cities, localities } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { ValidationError, NotFoundError, ConflictError } from '../lib/errors';
import { z } from 'zod';

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

// ── Admin Operations ────────────────────────────────────────────────

export async function listAllPages() {
  return db
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
}

export async function getPageById(id: number) {
  const [page] = await db
    .select()
    .from(contentPages)
    .where(eq(contentPages.id, id))
    .limit(1);
  if (!page) throw new NotFoundError('Page not found');
  return page;
}

export async function createPage(body: unknown) {
  const result = contentPageSchema.safeParse(body);
  if (!result.success) throw new ValidationError(result.error.issues[0].message);

  try {
    const now = new Date();
    const [page] = await db
      .insert(contentPages)
      .values({
        ...result.data,
        publishedAt: result.data.isPublished ? now : null,
      })
      .returning();
    return page;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('unique')) {
      throw new ConflictError('A page with this slug already exists.');
    }
    throw err;
  }
}

export async function updatePage(id: number, body: unknown) {
  const result = updateContentPageSchema.safeParse(body);
  if (!result.success) throw new ValidationError(result.error.issues[0].message);

  const [existing] = await db
    .select({ isPublished: contentPages.isPublished, publishedAt: contentPages.publishedAt })
    .from(contentPages)
    .where(eq(contentPages.id, id))
    .limit(1);
  if (!existing) throw new NotFoundError('Page not found');

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
  return page;
}

export async function deletePage(id: number) {
  const [existing] = await db
    .select({ id: contentPages.id })
    .from(contentPages)
    .where(eq(contentPages.id, id))
    .limit(1);
  if (!existing) throw new NotFoundError('Page not found');
  await db.delete(contentPages).where(eq(contentPages.id, id));
  return { message: 'Page deleted' };
}

// ── Public Operations ───────────────────────────────────────────────

export async function listPublishedPages(query: unknown) {
  const parsedQuery = contentListQuerySchema.safeParse(query);
  if (!parsedQuery.success) throw new ValidationError(parsedQuery.error.issues[0].message);

  const { cityId } = parsedQuery.data;
  const conditions = [eq(contentPages.isPublished, true)];
  if (cityId !== undefined) conditions.push(eq(contentPages.cityId, cityId));

  return db
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
}

export async function getPublishedPageBySlug(slug: string) {
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
  if (!page) throw new NotFoundError('Page not found');
  return page;
}
