import 'dotenv/config';
import { createApp } from './app';
// Side-effect import — instantiates the BullMQ Worker that actually consumes
// the 'payslip-send' queue. Without this, POST /:id/send-payslips happily
// enqueues a job that nothing ever processes: the queue accepts it, but no
// payslip status ever flips to 'paid' and no email is ever "sent" (logged).
import './lib/payroll/workers/sendPayslips';

const app = createApp();
const PORT = process.env.PORT ?? 4000;

app.listen(PORT, () => {
  console.log(`Express API listening on :${PORT}`);
});
