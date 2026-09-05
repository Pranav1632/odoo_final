import { prisma } from './prisma';

export async function writeErrorLog(params: {
  route: string;
  userId?: string;
  message: string;
  stack?: string;
}) {
  console.error(`[ERROR] ${params.route}`, params.message, params.stack ?? '');
  try {
    await prisma.errorLog.create({ data: params });
  } catch {
    // never let error logging crash the app
    console.error('[ERROR LOG WRITE FAILED]', params);
  }
}
