import { Worker } from 'bullmq';
import { redisConnection } from '../queue';
import { prisma } from '../../prisma';
import { writeAuditLog } from '../../audit';
import { writeErrorLog } from '../../errorLog';

interface SendPayslipsJobData {
  payrunId: string;
  requestedByUserId: string;
}

/**
 * BullMQ worker for the 'payslip-send' queue.
 *
 * For each validated/paid payslip in the payrun:
 * - Looks up the employee's email
 * - LOCAL DEMO ONLY: logs to console instead of calling any email API
 * - Updates payslip status to 'paid'
 *
 * Writes an audit log entry when done.
 * Writes an error log entry per employee with no email.
 */
export const sendPayslipsWorker = new Worker<SendPayslipsJobData>(
  'payslip-send',
  async (job) => {
    const { payrunId, requestedByUserId } = job.data;

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
  },
  { connection: redisConnection }
);
