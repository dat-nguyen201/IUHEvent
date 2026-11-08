import 'dotenv/config';

import { ObjectId } from 'mongodb';

import { connectDatabase, closeDatabase } from '../db/mongo';
import { hashPassword } from '../lib/security';
import type { OrganizerDocument, UserDocument } from '../types/domain';

async function main() {
  const email = (process.env.ORGANIZER_EMAIL || 'organizer@iuh.edu.vn').trim().toLowerCase();
  const password = process.env.ORGANIZER_PASSWORD || 'Organizer12345!';
  const name = (process.env.ORGANIZER_NAME || 'Đơn vị Tổ chức Sự kiện IUH').trim();
  const studentId = (process.env.ORGANIZER_STUDENT_ID || 'ORG-001').trim().toUpperCase();

  const { db } = await connectDatabase();
  const users = db.collection<UserDocument>('users');
  const organizers = db.collection<OrganizerDocument>('organizers');
  const existing = await users.findOne({ email });
  const now = new Date();
  const organizerId = existing?.organizerId ?? new ObjectId();
  const organizerName = existing?.organizerName || existing?.name || name;
  const passwordHash = await hashPassword(password);
  let accountId: ObjectId;

  if (existing) {
    accountId = existing._id;
    await users.updateOne(
      { _id: accountId },
      {
        $set: {
          passwordHash,
          role: 'organizer',
          status: 'active',
          organizerId,
          organizerName,
          updatedAt: now,
        },
      },
    );
  } else {
    const result = await users.insertOne({
      name,
      studentId,
      email,
      passwordHash,
      major: 'Ban Tổ chức',
      role: 'organizer',
      status: 'active',
      organizerId,
      organizerName: name,
      createdAt: now,
      updatedAt: now,
    });
    accountId = result.insertedId;
  }

  if (!(await organizers.findOne({ accountId }))) {
    await organizers.insertOne({
      _id: organizerId,
      accountId,
      name: organizerName,
      shortName: organizerName.slice(0, 60),
      type: 'club',
      description: 'Đơn vị tổ chức các hoạt động và sự kiện cho sinh viên IUH.',
      contactEmail: email,
      location: 'Trường ĐH Công nghiệp TP.HCM',
      color: '#FD7E14',
      createdAt: now,
      updatedAt: now,
    });
  }

  console.log(`[seed] Organizer account and organization are ready for ${email}.`);
}

void main().catch((error: unknown) => {
  console.error('[seed] Failed:', error);
  process.exitCode = 1;
}).finally(closeDatabase);
