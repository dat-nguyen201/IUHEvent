import 'dotenv/config';

import { createApp } from './app';
import { closeDatabase, connectDatabase } from './db/mongo';

async function main() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('Set JWT_SECRET to a random value with at least 32 characters.');
  }

  const { db } = await connectDatabase();
  const app = createApp(db);
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`[api] IUH Event API listening on port ${port}`);
  });

  const shutdown = () => {
    server.close(() => {
      void closeDatabase().finally(() => process.exit(0));
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

void main().catch(async (error: unknown) => {
  console.error('[api] Failed to start:', error);
  await closeDatabase();
  process.exitCode = 1;
});
