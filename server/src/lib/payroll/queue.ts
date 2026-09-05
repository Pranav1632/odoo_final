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
});

/**
 * BullMQ queue for bulk payslip send jobs.
 * Scoped to this one job type — nothing else uses this queue.
 */
export const payslipSendQueue = new Queue('payslip-send', {
  connection: redisConnection,
});
