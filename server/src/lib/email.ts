import nodemailer, { Transporter } from 'nodemailer';

/**
 * Shared SMTP transport for outbound mail. Defaults to Mailpit
 * (https://mailpit.axllent.org/) for local/dev/demo use — a real local SMTP
 * server with no external delivery, viewable at http://localhost:8025.
 *
 * Point SMTP_HOST/SMTP_PORT at a real provider's SMTP endpoint (e.g. Resend,
 * SendGrid, SES) in production; no other code needs to change since it's all
 * plain SMTP under the hood.
 */
let transport: Transporter | null = null;

export function getEmailTransport(): Transporter {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'localhost',
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: false,
      // Mailpit (and most local SMTP catchers) don't require auth.
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transport;
}

export interface PayslipEmailParams {
  to: string;
  employeeName: string;
  payrunName: string;
  periodLabel: string;
  netSalary: number | null;
  pdfBuffer: Buffer;
  pdfFilename: string;
}

export async function sendPayslipEmail(params: PayslipEmailParams) {
  const net =
    params.netSalary !== null
      ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
          params.netSalary
        )
      : 'N/A';

  await getEmailTransport().sendMail({
    from: process.env.SMTP_FROM ?? 'payroll@peoplepay360.local',
    to: params.to,
    subject: `Your Payslip — ${params.payrunName}`,
    text: `Hi ${params.employeeName},\n\nYour payslip for ${params.periodLabel} (${params.payrunName}) is attached.\nNet Salary: ${net}\n\nThis is an automated message from PeoplePay360.`,
    html: `<p>Hi ${params.employeeName},</p><p>Your payslip for <strong>${params.periodLabel}</strong> (${params.payrunName}) is attached.</p><p>Net Salary: <strong>${net}</strong></p><p style="color:#888;font-size:12px;">This is an automated message from PeoplePay360.</p>`,
    attachments: [
      {
        filename: params.pdfFilename,
        content: params.pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}
