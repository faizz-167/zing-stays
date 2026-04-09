import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!, {
  lazyConnect: true,
  enableOfflineQueue: false,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

export async function cacheGet(key: string): Promise<unknown> {
  const val = await redis.get(key);
  return val ? JSON.parse(val) : null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function cacheInvalidate(key: string): Promise<void> {
  await redis.del(key);
}

export async function cacheInvalidateByPrefix(prefix: string): Promise<void> {
  const keys = await redis.keys(`${prefix}*`);
  if (keys.length === 0) return;
  await redis.del(...keys);
}
