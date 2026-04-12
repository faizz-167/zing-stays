import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { parseIntParam } from '../lib/routeUtils';
import { getRentEstimate, getPriceTrends } from '../services/PriceAnalyticsService';

const router = Router();

// GET /api/utilities/rent-estimate/:localityId
router.get('/rent-estimate/:localityId', asyncHandler(async (req, res) => {
  const localityId = parseIntParam(req, res, 'localityId');
  if (localityId === null) return;
  const payload = await getRentEstimate(localityId);
  res.json(payload);
}));

// GET /api/utilities/price-trends/:localityId
router.get('/price-trends/:localityId', asyncHandler(async (req, res) => {
  const localityId = parseIntParam(req, res, 'localityId');
  if (localityId === null) return;
  const payload = await getPriceTrends(localityId);
  res.json(payload);
}));

export default router;
