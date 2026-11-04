import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { Db } from 'mongodb';

import { HttpError } from './lib/errors';
import { errorHandler } from './middleware/errors';
import { createAdminEventsRouter } from './routes/admin-events';
import { createAdminUsersRouter } from './routes/admin-users';
import { createAuthRouter } from './routes/auth';
import { createEventsRouter } from './routes/events';
import { createMeRouter } from './routes/me';

const defaultOrigins = ['http://localhost:8081', 'http://localhost:8084', 'http://127.0.0.1:8081', 'http://127.0.0.1:8084'];

export function createApp(db: Db) {
  const app = express();
  const allowedOrigins = (process.env.CORS_ORIGINS ?? defaultOrigins.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new HttpError(403, 'CORS_ORIGIN_DENIED', 'Origin này không được phép truy cập API.'));
    },
  }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', async (_req, res) => {
    await db.command({ ping: 1 });
    res.json({ ok: true, database: 'connected' });
  });
  app.get('/api/health', async (_req, res) => {
    await db.command({ ping: 1 });
    res.json({ ok: true, database: 'connected' });
  });

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/events', createEventsRouter(db));
  app.use('/api/me', createMeRouter(db));
  app.use('/api/admin/events', createAdminEventsRouter(db));
  app.use('/api/admin/users', createAdminUsersRouter(db));

  app.use((_req, res) => {
    res.status(404).json({ code: 'ROUTE_NOT_FOUND', message: 'Không tìm thấy API.' });
  });
  app.use(errorHandler);
  return app;
}
