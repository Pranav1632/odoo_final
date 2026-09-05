import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';

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

  // Routes will be mounted here as they are built
  // app.use('/api/auth', authRoutes);
  // app.use('/api/employees', employeeRoutes);
  // etc.

  // Must be LAST — after all routes
  app.use(errorHandler);

  return app;
}
