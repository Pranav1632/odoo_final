import { Queue } from 'bullmq';
import IORedis from 'ioredis';

/**
 * Shared Redis connection used by the BullMQ queue and worker.
 * maxRetriesPerRequest: null is required by BullMQ.
 */
export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
  lazyConnect: process.env.NODE_ENV === 'test',
  enableOfflineQueue: false,
  connectTimeout: 3000,
  // Without a bounded retry strategy, ioredis retries forever with backoff and a
  // request that enqueues a job (e.g. POST /:id/send-payslips) hangs indefinitely
  // instead of failing fast when Redis is unreachable — give up after a few tries
  // so callers get their ECONNREFUSED/timeout promptly.
  retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
});

/**
 * BullMQ queue for bulk payslip send jobs.
 * Scoped to this one job type — nothing else uses this queue.
 */
export const payslipSendQueue = new Queue('payslip-send', {
  connection: redisConnection,
});
