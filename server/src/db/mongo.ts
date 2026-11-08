import { MongoClient, type Db } from 'mongodb';

let client: MongoClient | null = null;

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required. Copy server/.env.example to server/.env.');

  client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'iuh_event');
  await ensureIndexes(db);
  return { client, db };
}

export async function closeDatabase() {
  if (client) await client.close();
  client = null;
}

export async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' }),
    db.collection('users').createIndex({ studentId: 1 }, { unique: true, name: 'users_student_id_unique' }),
    db.collection('users').createIndex({ role: 1, status: 1 }),
    db.collection('events').createIndex({ id: 1 }, { unique: true, name: 'events_public_id_unique' }),
    db.collection('events').createIndex({ status: 1, startsAt: 1 }),
    db.collection('events').createIndex({ title: 'text', location: 'text' }, { name: 'events_search_text' }),
    db.collection('registrations').createIndex({ userId: 1, eventId: 1 }, { unique: true, name: 'registrations_user_event_unique' }),
    db.collection('registrations').createIndex({ eventId: 1, status: 1 }),
    db.collection('savedEvents').createIndex({ userId: 1, eventId: 1 }, { unique: true, name: 'saved_user_event_unique' }),
    db.collection('savedEvents').createIndex({ userId: 1, savedAt: -1 }),
    db.collection('reviews').createIndex({ eventId: 1, createdAt: -1 }),
    db.collection('reviews').createIndex({ userId: 1, eventId: 1 }),
    db.collection('notifications').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('notifications').createIndex({ userId: 1, read: 1 }),
  ]);
}
