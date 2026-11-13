import { Queue } from 'bullmq';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

const redisConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => {
    if (times > 2) return null; // Stop retrying if Redis is not running
    return 1000;
  },
  lazyConnect: true,
};

export let remindersQueue: Queue | null = null;
export let campaignsQueue: Queue | null = null;
export let notificationsQueue: Queue | null = null;

export function initializeQueues(): void {
  try {
    remindersQueue = new Queue('reminders', { connection: redisConnection });
    campaignsQueue = new Queue('campaigns', { connection: redisConnection });
    notificationsQueue = new Queue('notifications', { connection: redisConnection });

    remindersQueue.on('error', (err) => logger.debug('remindersQueue Redis error', { error: err.message }));
    campaignsQueue.on('error', (err) => logger.debug('campaignsQueue Redis error', { error: err.message }));
    notificationsQueue.on('error', (err) => logger.debug('notificationsQueue Redis error', { error: err.message }));

    logger.info('BullMQ queues initialized');
  } catch (error) {
    logger.warn('Failed to initialize BullMQ queues', { error: (error as Error).message });
  }
}
