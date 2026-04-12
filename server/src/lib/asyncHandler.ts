import type { Request, Response, NextFunction } from 'express';

/**
 * Wrap an async Express handler so rejected promises are forwarded to
 * the central error middleware instead of causing unhandled rejections.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
