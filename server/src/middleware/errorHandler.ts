import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { ListingInputError } from '../lib/routeUtils';
import { logger } from '../lib/logger';

/**
 * Central Express error middleware.
 * Maps typed errors to HTTP status codes; logs unexpected errors.
 *
 * Register as the LAST middleware in the Express chain:
 *   app.use(errorHandler);
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Typed application errors — known status codes
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Legacy ListingInputError (pre-refactor compat) → 400
  if (err instanceof ListingInputError) {
    res.status(400).json({ error: err.message });
    return;
  }

  // Unexpected errors — log full details, return generic 500
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
}
