import Redis from 'ioredis';
import { env } from './environment';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

function createRedisClient(): Redis {
  const redisOptions: Redis['options'] = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    retryStrategy: (times: number) => {
      if (times > 3) {
        logger.error('Redis max retry attempts reached, giving up');
        return null;
      }
      const delay = Math.min(times * 200, 2000);
      logger.warn(`Redis retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err: Error) => {
      logger.error('Redis reconnecting on error', { error: err.message });
      return true;
    },
    lazyConnect: false,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  };

  const client = new Redis(redisOptions);

  client.on('connect', () => {
    logger.info('✅ Redis connected successfully', {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    });
  });

  client.on('ready', () => {
    logger.info('Redis client ready');
  });

  client.on('error', (err: Error) => {
    logger.error('Redis client error', { error: err.message });
  });

  client.on('close', () => {
    logger.warn('Redis connection closed');
  });

  client.on('reconnecting', () => {
    logger.info('Redis reconnecting...');
  });

  client.on('end', () => {
    logger.warn('Redis connection ended');
  });

  return client;
}

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

export async function initializeRedis(): Promise<void> {
  try {
    const client = getRedis();
    await client.ping();
    logger.info('Redis ping successful');
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to initialize Redis', { error: err.message });
    throw error;
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      const err = error as Error;
      logger.error('Error closing Redis connection', { error: err.message });
    }
  }
}
