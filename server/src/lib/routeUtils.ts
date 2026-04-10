import type { Request, Response } from 'express';

/**
 * Custom error for listing input validation failures (city/locality resolution).
 * Use `instanceof` instead of fragile string matching.
 */
export class ListingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ListingInputError';
  }
}

/**
 * Parse an integer route parameter. Returns the parsed number or sends
 * a 400 response and returns `null`.
 */
export function parseIntParam(req: Request, res: Response, param: string): number | null {
  const raw = req.params[param];
  const value = parseInt(raw as string, 10);
  if (isNaN(value)) {
    res.status(400).json({ error: `Invalid ${param}` });
    return null;
  }
  return value;
}
