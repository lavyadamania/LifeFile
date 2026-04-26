import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

export async function connectRedis(): Promise<void> {
  await redis.connect();
  logger.info('Redis connected');
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info('Redis disconnected');
}
