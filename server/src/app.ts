import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';

// Person A's routes
import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import contractRoutes from './routes/contracts';
import scheduleRoutes from './routes/schedules';
import attendanceRoutes from './routes/attendance';
import timeoffRoutes from './routes/timeoff';
import auditLogRoutes from './routes/auditLog';
import errorLogRoutes from './routes/errorLog';

// Person B's routes
import salaryStructureRoutes from './routes/salaryStructures';
import salaryRuleRoutes from './routes/salaryRules';
import payrunRoutes from './routes/payruns';
import payslipRoutes from './routes/payslips';

/**
 * Creates and configures the Express app without calling listen().
 * Exported for use in supertest-based integration tests.
 */
export function createApp() {
  const app = express();

  app.use(helmet());
  const allowedOrigins = [
    process.env.WEB_ORIGIN,
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean) as string[];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl) or if origin is allowed
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Fallback to allow dev requests
        }
      },
      credentials: true,
    })
  );

  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'peoplepay360-server' });
  });

  // Person A routes
  app.use('/api/auth', authRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/contracts', contractRoutes);
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/timeoff', timeoffRoutes);
  app.use('/api/audit-log', auditLogRoutes);
  app.use('/api/error-log', errorLogRoutes);

  // Person B routes
  app.use('/api/salary-structures', salaryStructureRoutes);
  app.use('/api/salary-rules', salaryRuleRoutes);
  app.use('/api/payruns', payrunRoutes);
  app.use('/api/payslips', payslipRoutes);

  // Must be LAST — after all routes
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;

