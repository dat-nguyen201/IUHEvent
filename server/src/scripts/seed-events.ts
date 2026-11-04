import 'dotenv/config';

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { connectDatabase, closeDatabase } from '../db/mongo';
import type { EventDocument, PublicEvent } from '../types/domain';

type SeedFile = { data: PublicEvent[] };

async function main() {
  const seedPath = resolve(process.cwd(), '../mock-api/events.json');
  const seed = JSON.parse(await readFile(seedPath, 'utf8')) as SeedFile;
  if (!Array.isArray(seed.data)) throw new Error('Seed file must contain a data array.');

  const { db } = await connectDatabase();
  const events = db.collection<EventDocument>('events');
  const now = new Date();
  for (const event of seed.data) {
    await events.updateOne(
      { id: event.id },
      {
        $setOnInsert: {
          id: event.id,
          title: event.title,
          description: event.description,
          startsAt: new Date(event.startsAt),
          location: event.location,
          category: event.category,
          organizer: event.organizer,
          imageKey: event.imageKey,
          imageUrl: event.imageUrl,
          capacity: event.capacity,
          registeredCount: 0,
          checkedInCount: event.checkedInCount,
          summarySource: event.summarySource,
          status: 'published',
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }
  console.log(`[seed] Ensured ${seed.data.length} sample events.`);
}

void main().catch((error: unknown) => {
  console.error('[seed] Failed:', error);
  process.exitCode = 1;
}).finally(closeDatabase);
