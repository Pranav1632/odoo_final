import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';

// Person A's routes (stubs — will be filled by Person A)
// import authRoutes from './routes/auth';
// import employeeRoutes from './routes/employees';
// import contractRoutes from './routes/contracts';
// import scheduleRoutes from './routes/schedules';
// import attendanceRoutes from './routes/attendance';
// import timeoffRoutes from './routes/timeoff';
// import auditLogRoutes from './routes/auditLog';
// import errorLogRoutes from './routes/errorLog';

// Person B's routes
import salaryStructureRoutes from './routes/salaryStructures';
import salaryRuleRoutes from './routes/salaryRules';
import payrunRoutes from './routes/payruns';
import payslipRoutes from './routes/payslips';

// Person C's route (mounted by Person A when ready)
// import dashboardRoutes from './routes/dashboard';

/**
 * Creates and configures the Express app without calling listen().
 * Exported for use in supertest-based integration tests.
 * Person A owns this file (app shell, route mounting order).
 */
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

  // Person A routes (uncomment as Person A delivers them)
  // app.use('/api/auth', authRoutes);
  // app.use('/api/employees', employeeRoutes);
  // app.use('/api/contracts', contractRoutes);
  // app.use('/api/schedules', scheduleRoutes);
  // app.use('/api/attendance', attendanceRoutes);
  // app.use('/api/timeoff', timeoffRoutes);
  // app.use('/api/audit-log', auditLogRoutes);
  // app.use('/api/error-log', errorLogRoutes);

  // Person B routes
  app.use('/api/salary-structures', salaryStructureRoutes);
  app.use('/api/salary-rules', salaryRuleRoutes);
  app.use('/api/payruns', payrunRoutes);
  app.use('/api/payslips', payslipRoutes);

  // Person C route (uncomment when delivered)
  // app.use('/api/dashboard', dashboardRoutes);

  // MUST be last — Express error-handling middleware
  app.use(errorHandler);

  return app;
}
