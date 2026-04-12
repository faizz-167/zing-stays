import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
import { toNodeHandler } from 'better-auth/node';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

import { db } from './db';
import { redis } from './lib/redis';
import { auth } from './lib/auth';
import { setupSearchIndex, reindexAllListings } from './services/search';
import { searchClient } from './services/search';
import './workers/searchIndexWorker';
import './workers/moderationWorker';
import { schedulePriceSnapshots } from './workers/priceSnapshotWorker';
import authRoutes from './routes/auth';
import listingRoutes from './routes/listings';
import searchRoutes from './routes/search';
import favoriteRoutes from './routes/favorites';
import imageRoutes from './routes/images';
import adminRoutes from './routes/admin';
import placesRoutes from './routes/places';
import seoRoutes from './routes/seo';
import utilitiesRoutes from './routes/utilities';
import reviewsRoutes from './routes/reviews';
import contentRoutes from './routes/content';

const app = express();
const PORT = process.env.PORT || 4000;

type DependencyStatus = 'up' | 'down' | 'unknown';

const dependencyStatus: Record<'database' | 'redis' | 'search', DependencyStatus> = {
  database: 'unknown',
  redis: 'unknown',
  search: 'unknown',
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function checkDatabaseConnection(): Promise<void> {
  await withTimeout(db.execute(sql`select 1`), 5000, 'Database connection');
  dependencyStatus.database = 'up';
}

async function checkRedisConnection(): Promise<void> {
  if (redis.status === 'wait') {
    await redis.connect();
  }

  await withTimeout(redis.ping(), 5000, 'Redis connection');
  dependencyStatus.redis = 'up';
}

async function checkSearchConnection(): Promise<void> {
  await withTimeout(searchClient.health(), 5000, 'Meilisearch connection');
  dependencyStatus.search = 'up';
}

app.use(helmet());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
// Trust the first proxy hop so req.ip reflects the real client IP.
// Adjust the number to match the actual number of reverse-proxy hops
// (e.g., nginx → this server = 1).
app.set('trust proxy', 1);

app.all('/api/auth/{*path}', toNodeHandler(auth));
app.use(express.json());
app.use('/api/account', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', placesRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/utilities', utilitiesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/content', contentRoutes);

app.get('/api/health', (_req, res) => {
  const overallStatus =
    dependencyStatus.database !== 'up'
      ? 'error'
      : Object.values(dependencyStatus).every((status) => status === 'up')
        ? 'ok'
        : 'degraded';

  res.status(overallStatus === 'error' ? 503 : 200).json({
    status: overallStatus,
    dependencies: dependencyStatus,
  });
});

app.use(errorHandler);

async function bootstrap(): Promise<void> {
  try {
    await checkDatabaseConnection();
  } catch (err) {
    dependencyStatus.database = 'down';
    logger.error('Database connection check failed:', err);
    process.exit(1);
  }

  try {
    await checkRedisConnection();
  } catch (err) {
    dependencyStatus.redis = 'down';
    logger.error('Redis connection check failed:', err);
  }

  try {
    await checkSearchConnection();
    await setupSearchIndex();
    await reindexAllListings();
  } catch (err) {
    dependencyStatus.search = 'down';
    logger.error('Search initialization failed:', err);
  }

  if (dependencyStatus.redis === 'up') {
    schedulePriceSnapshots().catch((err) => {
      logger.error('Price snapshot scheduling failed:', err);
    });
  }

  const server = app.listen(PORT, () =>
    logger.info(`Server running on port ${PORT}`)
  );

  server.on('error', (err: NodeJS.ErrnoException) => {
    logger.error('Failed to start server:', err.message);
    process.exit(1);
  });
}

void bootstrap();

export default app;
