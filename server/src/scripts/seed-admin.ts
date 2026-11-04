import 'dotenv/config';

import { connectDatabase, closeDatabase } from '../db/mongo';
import { hashPassword } from '../lib/security';
import type { UserDocument } from '../types/domain';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim();
  const studentId = process.env.ADMIN_STUDENT_ID?.trim().toUpperCase();
  if (!email || !password || !name || !studentId) {
    throw new Error('Set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, and ADMIN_STUDENT_ID before seeding.');
  }
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');

  const { db } = await connectDatabase();
  const users = db.collection<UserDocument>('users');
  const existing = await users.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin') throw new Error('That email already belongs to a non-admin account; refusing to promote it automatically.');
    console.log('[seed] Admin account already exists; no changes made.');
    return;
  }

  const now = new Date();
  await users.insertOne({
    name,
    studentId,
    email,
    passwordHash: await hashPassword(password),
    major: 'Quản trị hệ thống',
    role: 'admin',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });
  console.log(`[seed] Admin account created for ${email}.`);
}

void main().catch((error: unknown) => {
  console.error('[seed] Failed:', error);
  process.exitCode = 1;
}).finally(closeDatabase);
