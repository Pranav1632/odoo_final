import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import contractRoutes from './routes/contracts';
import scheduleRoutes from './routes/schedules';
import attendanceRoutes from './routes/attendance';
import timeoffRoutes from './routes/timeoff';
import auditLogRoutes from './routes/auditLog';
import errorLogRoutes from './routes/errorLog';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
      credentials: true,
    })
  );
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'peoplepay360-server' });
  });

  // Mount routes
  app.use('/api/auth', authRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/contracts', contractRoutes);
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/timeoff', timeoffRoutes);
  app.use('/api/audit-log', auditLogRoutes);
  app.use('/api/error-log', errorLogRoutes);

  // Must be LAST — after all routes
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
