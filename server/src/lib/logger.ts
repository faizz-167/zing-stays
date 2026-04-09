/**
 * Minimal structured logger.
 * Drop-in replacement body: swap for pino/winston without touching call sites.
 */
export const logger = {
  error: (msg: string, err?: unknown) =>
    console.error(`[ERROR] ${msg}`, err instanceof Error ? err.message : (err ?? '')),
  warn: (msg: string, data?: unknown) =>
    console.warn(`[WARN] ${msg}`, data ?? ''),
  info: (msg: string, data?: unknown) =>
    console.info(`[INFO] ${msg}`, data ?? ''),
};
