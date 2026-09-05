import { Worker } from 'bullmq';
import { redisConnection } from '../queue';
import { prisma } from '../../prisma';
import { writeAuditLog } from '../../audit';
import { writeErrorLog } from '../../errorLog';

export interface SendPayslipsJobData {
  payrunId: string;
  requestedByUserId: string;
}

/**
 * Core send-payslips logic, factored out of the BullMQ Worker callback so it can
 * be exercised directly (e.g. in tests, or environments without Redis) without
 * needing a live queue connection.
 *
 * For each validated payslip in the payrun:
 * - Looks up the employee's email
 * - LOCAL DEMO ONLY: logs to console instead of calling any email API
 * - Updates payslip status to 'paid'
 *
 * Writes an audit log entry when done.
 * Writes an error log entry per employee with no email.
 */
export async function processSendPayslipsJob({ payrunId, requestedByUserId }: SendPayslipsJobData) {
  // Only pick up payslips still awaiting send — 'paid' ones were already sent by a
  // prior run of this job, and re-including them here would re-email and re-log them.
  const payslips = await prisma.payslip.findMany({
    where: {
      payrunId,
      status: 'validated',
    },
    include: {
      employee: {
        include: {
          user: { select: { email: true } },
        },
      },
    },
  });

  let sent = 0;
  const sentIds: string[] = [];

  for (const payslip of payslips) {
    const email = payslip.employee.user?.email;

    if (!email) {
      await writeErrorLog({
        route: 'sendPayslipsWorker',
        message: `No email for employee ${payslip.employeeId}`,
        userId: requestedByUserId,
      });
      continue;
    }

    // LOCAL DEMO ONLY — do NOT call any external email API
    console.log(`[PAYSLIP SEND] Would email payslip ${payslip.id} to ${email}`);

    sentIds.push(payslip.id);
    sent++;
  }

  if (sentIds.length > 0) {
    await prisma.payslip.updateMany({
      where: { id: { in: sentIds } },
      data: { status: 'paid' },
    });
  }

  await writeAuditLog({
    userId: requestedByUserId,
    action: 'SEND_PAYSLIPS',
    entityType: 'Payrun',
    entityId: payrunId,
    details: { sent, total: payslips.length },
  });

  return { sent };
}

/**
 * BullMQ worker for the 'payslip-send' queue — thin wrapper around
 * processSendPayslipsJob. Only instantiated when actually imported (server
 * startup does not import this module unless a queue consumer process does).
 */
export const sendPayslipsWorker = new Worker<SendPayslipsJobData>(
  'payslip-send',
  async (job) => processSendPayslipsJob(job.data),
  { connection: redisConnection }
);
