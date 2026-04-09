import { Router } from 'express';
import { z } from 'zod';
import { getAuthParams } from '../services/imagekit';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { imageAuthLimiter } from '../middleware/rateLimit';
import { logger } from '../lib/logger';

const router = Router();
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_IMAGES = 12;
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const imageAuthSchema = z.object({
  originalFileName: z.string().trim().min(1).max(200),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  size: z.number().int().positive().max(MAX_IMAGE_SIZE_BYTES),
  existingImageCount: z.number().int().min(0).max(MAX_TOTAL_IMAGES - 1),
});

function sanitizeFileName(originalFileName: string): string {
  const ext = originalFileName.includes('.')
    ? originalFileName.split('.').pop()!.toLowerCase()
    : 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';

  return `listing-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;
}

// POST /api/images/auth — ImageKit client-side upload auth params
router.post('/auth', requireAuth, imageAuthLimiter, (req: AuthRequest, res) => {
  const result = imageAuthSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? 'Invalid upload request' });
    return;
  }

  if (result.data.existingImageCount + 1 > MAX_TOTAL_IMAGES) {
    res.status(400).json({ error: `A listing can include up to ${MAX_TOTAL_IMAGES} images.` });
    return;
  }

  try {
    const folder = `/listings/user-${req.user!.userId}`;
    const expire = Math.floor(Date.now() / 1000) + 5 * 60;
    const token = `${req.user!.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const params = getAuthParams(token, expire);

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ...params,
      folder,
      fileName: sanitizeFileName(result.data.originalFileName),
    });
  } catch (err) {
    logger.error('ImageKit auth error', err);
    res.status(500).json({ error: 'Failed to get upload params' });
  }
});

export default router;
