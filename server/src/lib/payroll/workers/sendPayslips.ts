import { Worker } from 'bullmq';
import { redisConnection } from '../queue';
import { prisma } from '../../prisma';
import { writeAuditLog } from '../../audit';
import { writeErrorLog } from '../../errorLog';
import { generatePayslipPdf } from '../generatePdf';
import { sendPayslipEmail } from '../../email';

export interface SendPayslipsJobData {
  payrunId: string;
  requestedByUserId: string;
}

const periodFormatter = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });

/**
 * Core send-payslips logic, factored out of the BullMQ Worker callback so it can
 * be exercised directly (e.g. in tests, or environments without Redis) without
 * needing a live queue connection.
 *
 * For each validated payslip in the payrun:
 * - Looks up the employee's email
 * - Generates the payslip PDF and emails it via SMTP (Mailpit locally)
 * - Updates payslip status to 'paid'
 *
 * Writes an audit log entry when done.
 * Writes an error log entry per employee with no email, and per send failure
 * (without failing the whole batch — one bad address shouldn't block the rest).
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
      employee: { include: { user: { select: { email: true } } } },
      payrun: { select: { name: true, periodStart: true, periodEnd: true } },
      lines: { orderBy: { category: 'asc' } },
    },
  });

  let sent = 0;
  const sentIds: string[] = [];

  for (const payslip of payslips as any[]) {
    const email = payslip.employee.user?.email;

    if (!email) {
      await writeErrorLog({
        route: 'sendPayslipsWorker',
        message: `No email for employee ${payslip.employeeId}`,
        userId: requestedByUserId,
      });
      continue;
    }

    try {
      const pdfBuffer = await generatePayslipPdf({
        employee: payslip.employee,
        payrun: {
          name: payslip.payrun.name,
          periodStart: payslip.payrun.periodStart.toISOString(),
          periodEnd: payslip.payrun.periodEnd.toISOString(),
        },
        workedDays: payslip.workedDays,
        lines: payslip.lines,
        netSalary: payslip.netSalary,
      });

      await sendPayslipEmail({
        to: email,
        employeeName: payslip.employee.name,
        payrunName: payslip.payrun.name,
        periodLabel: periodFormatter.format(payslip.payrun.periodStart),
        netSalary: payslip.netSalary,
        pdfBuffer,
        pdfFilename: `payslip-${payslip.id}.pdf`,
      });
    } catch (err) {
      await writeErrorLog({
        route: 'sendPayslipsWorker',
        message: `Failed to email payslip ${payslip.id} to ${email}: ${(err as Error).message}`,
        userId: requestedByUserId,
      });
      continue;
    }

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

sendPayslipsWorker.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('[sendPayslipsWorker] Worker error:', err?.message || err);
  }
});

