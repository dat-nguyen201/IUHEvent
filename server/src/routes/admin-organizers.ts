import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { ObjectId, type Db } from 'mongodb';

import { conflict, forbidden, notFound } from '../lib/errors';
import { hashPassword } from '../lib/security';
import { createOrganizerSchema, updateOrganizerSchema } from '../lib/validation';
import { requireAdmin, requireAuth } from '../middleware/auth';
import {
  toPublicOrganizer,
  toPublicUser,
  type OrganizerDocument,
  type EventDocument,
  type UserDocument,
} from '../types/domain';

export function createAdminOrganizersRouter(db: Db) {
  const router = Router();
  const organizers = db.collection<OrganizerDocument>('organizers');
  const users = db.collection<UserDocument>('users');
  router.use(requireAuth(db));

  router.get('/', async (req, res) => {
    const user = req.authUser!;
    if (user.role === 'organizer') {
      const organizer = await organizers.findOne({ accountId: user._id });
      if (!organizer) throw notFound('ORGANIZER_NOT_FOUND', 'Tài khoản chưa được gắn với đơn vị tổ chức.');
      res.json({ data: [toPublicOrganizer(organizer)] });
      return;
    }
    if (user.role !== 'admin') throw forbidden();

    const rows = await organizers.find().sort({ createdAt: -1 }).toArray();
    res.json({ data: rows.map(toPublicOrganizer) });
  });

  router.patch('/me', async (req, res) => {
    const user = req.authUser!;
    if (user.role !== 'organizer') throw forbidden();

    const input = updateOrganizerSchema.parse(req.body);
    const organizer = await organizers.findOne({ accountId: user._id });
    if (!organizer) throw notFound('ORGANIZER_NOT_FOUND', 'Tài khoản chưa được gắn với đơn vị tổ chức.');

    const now = new Date();
    await organizers.updateOne(
      { _id: organizer._id, accountId: user._id },
      { $set: { ...input, updatedAt: now } },
    );

    if (input.name && input.name !== organizer.name) {
      await Promise.all([
        users.updateOne(
          { _id: user._id, role: 'organizer' },
          { $set: { organizerName: input.name, updatedAt: now } },
        ),
        db.collection<EventDocument>('events').updateMany(
          { organizer: organizer.name },
          { $set: { organizer: input.name, updatedAt: now } },
        ),
      ]);
    }

    const updated = await organizers.findOne({ _id: organizer._id, accountId: user._id });
    res.json({ data: toPublicOrganizer(updated!) });
  });

  router.post('/', requireAdmin, async (req, res) => {
    const input = createOrganizerSchema.parse(req.body);
    if (await users.findOne({ email: input.email }, { projection: { _id: 1 } })) {
      throw conflict('EMAIL_EXISTS', 'Email này đã thuộc về tài khoản khác.');
    }

    const now = new Date();
    const organizerId = new ObjectId();
    const accountId = new ObjectId();
    const initialPassword = randomBytes(18).toString('base64url');
    const studentId = `ORG-${randomBytes(6).toString('hex').toUpperCase()}`;
    const user: UserDocument & { _id: ObjectId } = {
      _id: accountId,
      name: input.name,
      studentId,
      email: input.email,
      passwordHash: await hashPassword(initialPassword),
      major: input.name,
      role: 'organizer',
      status: 'active',
      organizerId,
      organizerName: input.name,
      createdAt: now,
      updatedAt: now,
    };
    const organizer: OrganizerDocument & { _id: ObjectId } = {
      _id: organizerId,
      accountId,
      name: input.name,
      shortName: input.shortName,
      type: input.type,
      description: input.description,
      contactEmail: input.email,
      location: input.location,
      color: input.color,
      createdAt: now,
      updatedAt: now,
    };

    await users.insertOne(user);
    try {
      await organizers.insertOne(organizer);
    } catch (error) {
      await users.deleteOne({ _id: accountId });
      throw error;
    }

    res.status(201).json({
      organizer: toPublicOrganizer(organizer),
      account: { user: toPublicUser(user), email: input.email, initialPassword },
    });
  });

  return router;
}
