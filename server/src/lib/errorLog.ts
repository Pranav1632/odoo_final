import { prisma } from './prisma';

interface ErrorLogInput {
  route: string;
  userId?: string;
  message: string;
  stack?: string;
}

/**
 * Writes an error log entry to the ErrorLog table.
 * Person A owns this implementation.
 */
export async function writeErrorLog(input: ErrorLogInput): Promise<void> {
  await prisma.errorLog.create({
    data: {
      route: input.route,
      userId: input.userId,
      message: input.message,
      stack: input.stack,
    },
  });
}
