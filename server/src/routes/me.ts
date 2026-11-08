import { Router } from 'express';
import { MongoServerError, type Db, type Filter } from 'mongodb';

import { badRequest, conflict, forbidden, notFound, unauthorized } from '../lib/errors';
import { checkInSchema, changePasswordSchema, profileSchema } from '../lib/validation';
import { requireAuth } from '../middleware/auth';
import { hashPassword, signAccessToken, verifyPassword } from '../lib/security';
import {
  toPublicEvent,
  toPublicUser,
  type EventDocument,
  type RegistrationDocument,
  type SavedEventDocument,
  type UserDocument,
} from '../types/domain';

function isDuplicateKey(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
}

export function createMeRouter(db: Db) {
  const router = Router();
  const users = db.collection<UserDocument>('users');
  const events = db.collection<EventDocument>('events');
  const registrations = db.collection<RegistrationDocument>('registrations');
  const savedEvents = db.collection<SavedEventDocument>('savedEvents');
  router.use(requireAuth(db));

  router.get('/profile', (req, res) => {
    res.json({ user: toPublicUser(req.authUser!) });
  });

  router.patch('/profile', async (req, res) => {
    const input = profileSchema.parse(req.body);
    const userId = req.authUser!._id;
    await users.updateOne({ _id: userId }, { $set: { ...input, updatedAt: new Date() } });
    const user = await users.findOne({ _id: userId });
    res.json({ user: toPublicUser(user!) });
  });

  router.patch('/password', async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const currentUser = req.authUser!;
    if (!(await verifyPassword(currentPassword, currentUser.passwordHash))) {
      throw badRequest('CURRENT_PASSWORD_INVALID', 'Mật khẩu hiện tại chưa chính xác.');
    }
    if (await verifyPassword(newPassword, currentUser.passwordHash)) {
      throw badRequest('SAME_PASSWORD', 'Mật khẩu mới phải khác mật khẩu hiện tại.');
    }

    const nextVersion = (currentUser.credentialVersion ?? 0) + 1;
    const result = await users.updateOne(
      { _id: currentUser._id, passwordHash: currentUser.passwordHash },
      { $set: { passwordHash: await hashPassword(newPassword), updatedAt: new Date() }, $inc: { credentialVersion: 1 } },
    );
    if (!result.modifiedCount) throw conflict('PASSWORD_CHANGED', 'Mật khẩu vừa được thay đổi ở nơi khác. Hãy đăng nhập lại.');

    const updatedUser = await users.findOne({ _id: currentUser._id });
    if (!updatedUser) throw unauthorized();
    res.json({
      accessToken: signAccessToken(currentUser._id.toHexString(), nextVersion),
      user: toPublicUser(updatedUser),
    });
  });

  router.get('/saved-events', async (req, res) => {
    const saved = await savedEvents.find({ userId: req.authUser!._id }).sort({ savedAt: -1 }).toArray();
    const ids = saved.map((item) => item.eventId);
    const eventRows = ids.length ? await events.find({ id: { $in: ids } }).toArray() : [];
    const eventMap = new Map(eventRows.map((event) => [event.id, event]));
    res.json({
      data: saved.flatMap((item) => {
        const event = eventMap.get(item.eventId);
        return event ? [{ eventId: item.eventId, savedAt: item.savedAt.toISOString(), event: toPublicEvent(event) }] : [];
      }),
    });
  });

  router.post('/saved-events/:eventId', async (req, res) => {
    const event = await events.findOne({ id: req.params.eventId, status: 'published' });
    if (!event) throw notFound('EVENT_NOT_FOUND', 'Không tìm thấy sự kiện đang mở.');

    await savedEvents.updateOne(
      { userId: req.authUser!._id, eventId: event.id },
      { $setOnInsert: { userId: req.authUser!._id, eventId: event.id, savedAt: new Date() } },
      { upsert: true },
    );
    res.json({ eventId: event.id, status: 'saved' });
  });

  router.delete('/saved-events/:eventId', async (req, res) => {
    await savedEvents.deleteOne({ userId: req.authUser!._id, eventId: req.params.eventId });
    res.json({ eventId: req.params.eventId, status: 'unsaved' });
  });

  router.get('/registrations', async (req, res) => {
    const rows = await registrations.find({ userId: req.authUser!._id }).sort({ registeredAt: -1 }).toArray();
    const ids = rows.map((item) => item.eventId);
    const eventRows = ids.length ? await events.find({ id: { $in: ids } }).toArray() : [];
    const eventMap = new Map(eventRows.map((event) => [event.id, event]));
    res.json({
      data: rows.map((registration) => ({
        eventId: registration.eventId,
        status: registration.status,
        registeredAt: registration.registeredAt.toISOString(),
        checkedInAt: registration.checkedInAt?.toISOString(),
        event: eventMap.has(registration.eventId) ? toPublicEvent(eventMap.get(registration.eventId)!) : null,
      })),
    });
  });

  router.post('/registrations/:eventId', async (req, res) => {
    const eventId = req.params.eventId;
    const userId = req.authUser!._id;
    const now = new Date();
    const event = await events.findOne({ id: eventId });
    if (!event || event.status !== 'published') throw notFound('EVENT_NOT_FOUND', 'Không tìm thấy sự kiện đang mở.');
    if (event.startsAt <= now) throw conflict('EVENT_EXPIRED', 'Sự kiện đã bắt đầu hoặc đã kết thúc.');

    const existing = await registrations.findOne({ userId, eventId });
    if (existing?.status === 'checked-in') throw conflict('ALREADY_CHECKED_IN', 'Bạn đã check-in sự kiện này.');
    if (existing?.status === 'registered') throw conflict('ALREADY_REGISTERED', 'Bạn đã đăng ký sự kiện này.');

    const reserved = await events.updateOne(
      {
        id: eventId,
        status: 'published',
        startsAt: { $gt: now },
        $expr: { $lt: [{ $ifNull: ['$registeredCount', 0] }, '$capacity'] },
      },
      { $inc: { registeredCount: 1 } },
    );
    if (!reserved.modifiedCount) throw conflict('EVENT_FULL', 'Sự kiện đã đủ số lượng đăng ký.');

    try {
      if (existing) {
        const result = await registrations.updateOne(
          { userId, eventId, status: 'cancelled' },
          { $set: { status: 'registered', registeredAt: now, updatedAt: now }, $unset: { checkedInAt: '' } },
        );
        if (!result.modifiedCount) throw conflict('ALREADY_REGISTERED', 'Trạng thái đăng ký vừa được cập nhật.');
      } else {
        await registrations.insertOne({ userId, eventId, status: 'registered', registeredAt: now, updatedAt: now });
      }
    } catch (error) {
      await events.updateOne({ id: eventId }, { $inc: { registeredCount: -1 } });
      if (isDuplicateKey(error)) throw conflict('ALREADY_REGISTERED', 'Bạn đã đăng ký sự kiện này.');
      throw error;
    }

    res.status(201).json({ eventId, status: 'registered' });
  });

  router.delete('/registrations/:eventId', async (req, res) => {
    const filter: Filter<RegistrationDocument> = {
      userId: req.authUser!._id,
      eventId: req.params.eventId,
      status: 'registered',
    };
    const result = await registrations.updateOne(filter, { $set: { status: 'cancelled', updatedAt: new Date() } });
    if (!result.modifiedCount) {
      const current = await registrations.findOne({ userId: req.authUser!._id, eventId: req.params.eventId });
      if (!current) throw notFound('REGISTRATION_NOT_FOUND', 'Bạn chưa đăng ký sự kiện này.');
      if (current.status === 'checked-in') throw conflict('ALREADY_CHECKED_IN', 'Không thể hủy đăng ký sau khi đã check-in.');
      res.json({ eventId: req.params.eventId, status: current.status });
      return;
    }
    await events.updateOne({ id: req.params.eventId }, { $inc: { registeredCount: -1 } });
    res.json({ eventId: req.params.eventId, status: 'cancelled' });
  });

  router.post('/registrations/:eventId/check-in', async (req, res) => {
    const { qrValue } = checkInSchema.parse(req.body);
    const eventId = req.params.eventId;
    if (qrValue !== eventId && qrValue !== `student-event:${eventId}`) {
      throw forbidden('INVALID_QR', 'Mã QR không khớp với sự kiện.');
    }

    const result = await registrations.updateOne(
      { userId: req.authUser!._id, eventId, status: 'registered' },
      { $set: { status: 'checked-in', checkedInAt: new Date(), updatedAt: new Date() } },
    );
    if (!result.modifiedCount) {
      const current = await registrations.findOne({ userId: req.authUser!._id, eventId });
      if (current?.status === 'checked-in') throw conflict('ALREADY_CHECKED_IN', 'Bạn đã check-in sự kiện này.');
      if (!current || current.status !== 'registered') throw conflict('REGISTRATION_REQUIRED', 'Bạn cần đăng ký sự kiện trước khi check-in.');
      throw conflict('CHECK_IN_FAILED', 'Không thể ghi nhận check-in. Hãy thử lại.');
    }

    await Promise.all([
      events.updateOne({ id: eventId }, { $inc: { checkedInCount: 1 } }),
      savedEvents.updateOne(
        { userId: req.authUser!._id, eventId },
        { $setOnInsert: { userId: req.authUser!._id, eventId, savedAt: new Date() } },
        { upsert: true },
      ),
    ]);
    res.json({ eventId, status: 'checked-in' });
  });

  return router;
}
