import { Router } from 'express';
import { ObjectId, type Db, type Filter } from 'mongodb';

import { conflict, notFound } from '../lib/errors';
import { createEventSchema, eventStatusSchema, updateEventSchema } from '../lib/validation';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { toPublicEvent, type EventDocument, type RegistrationDocument, type ReviewDocument, type UserDocument } from '../types/domain';

function pageNumber(value: unknown, fallback: number, max: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? Math.min(number, max) : fallback;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function newEventId() {
  return `event-${crypto.randomUUID()}`;
}

export function createAdminEventsRouter(db: Db) {
  const router = Router();
  const events = db.collection<EventDocument>('events');
  router.use(requireAuth(db), requireAdmin);

  router.get('/', async (req, res) => {
    const page = pageNumber(req.query.page, 1, 1_000_000);
    const pageSize = pageNumber(req.query.pageSize, 20, 100);
    const search = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const filter: Filter<EventDocument> = {};
    if (['draft', 'published', 'archived'].includes(status)) filter.status = status as EventDocument['status'];
    if (search) {
      const escaped = escapeRegExp(search);
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { location: { $regex: escaped, $options: 'i' } },
      ];
    }

    const reviews = db.collection<ReviewDocument>('reviews');

    const [total, rows] = await Promise.all([
      events.countDocuments(filter),
      events.find(filter).sort({ startsAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
    ]);

    const eventIds = rows.map((e) => e.id);
    const reviewStats = await reviews
      .aggregate([
        { $match: { eventId: { $in: eventIds } } },
        { $group: { _id: '$eventId', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      ])
      .toArray();
    const statsMap = new Map(
      reviewStats.map((s) => [s._id, { count: s.count, avgRating: Number(s.avgRating.toFixed(1)) }]),
    );

    res.json({
      data: rows.map((r) => ({
        ...toPublicEvent(r),
        avgRating: statsMap.get(r.id)?.avgRating ?? null,
        reviewCount: statsMap.get(r.id)?.count ?? 0,
      })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  });

  router.post('/', async (req, res) => {
    const input = createEventSchema.parse(req.body);
    const now = new Date();
    const event: EventDocument = {
      ...input,
      id: newEventId(),
      startsAt: new Date(input.startsAt),
      registeredCount: 0,
      checkedInCount: 0,
      createdBy: req.authUser!._id,
      createdAt: now,
      updatedAt: now,
    };
    await events.insertOne(event);

    // Tự động gửi thông báo sự kiện mới đến sinh viên
    try {
      const notifications = db.collection('notifications');
      const users = db.collection<UserDocument>('users');
      const allActiveStudents = await users.find({ role: 'student', status: 'active' }).limit(50).toArray();
      if (allActiveStudents.length > 0) {
        const newEventNotifs = allActiveStudents.map((u) => ({
          userId: u._id,
          eventId: event.id,
          title: `🎉 Sự kiện mới: ${event.title}`,
          body: `Đơn vị "${event.organizer}" vừa mở đăng ký sự kiện mới tại ${event.location}. Tham gia ngay!`,
          type: 'event',
          read: false,
          createdAt: now,
        }));
        await notifications.insertMany(newEventNotifs);
      }
    } catch (err) {
      console.warn('Failed to dispatch new event notifications:', err);
    }

    res.status(201).json({ data: toPublicEvent(event) });
  });

  router.get('/:eventId', async (req, res) => {
    const event = await events.findOne({ id: req.params.eventId });
    if (!event) throw notFound('EVENT_NOT_FOUND', 'Không tìm thấy sự kiện.');
    res.json({ data: toPublicEvent(event) });
  });

  router.get('/:eventId/attendance', async (req, res) => {
    const event = await events.findOne({ id: req.params.eventId });
    if (!event) throw notFound('EVENT_NOT_FOUND', 'Không tìm thấy sự kiện.');

    const registrations = db.collection<RegistrationDocument>('registrations');
    const users = db.collection<UserDocument>('users');

    const regList = await registrations.find({ eventId: event.id }).toArray();
    const userIds = regList.map((r) => r.userId);
    const userList = await users.find({ _id: { $in: userIds } }).toArray();
    const userMap = new Map(userList.map((u) => [u._id.toHexString(), u]));

    const attendance = regList.map((r) => {
      const u = userMap.get(r.userId.toHexString());
      return {
        studentId: u?.studentId || 'Chưa cập nhật',
        name: u?.name || 'Sinh viên IUH',
        email: u?.email || '',
        major: u?.major || 'Công nghệ Thông tin',
        status: r.status,
        registeredAt: r.registeredAt?.toISOString(),
        checkedInAt: r.checkedInAt?.toISOString() || null,
      };
    });

    res.json({
      event: toPublicEvent(event),
      data: attendance,
      total: attendance.length,
      checkedInTotal: attendance.filter((a) => a.status === 'checked-in').length,
    });
  });

  router.get('/:eventId/export-csv', async (req, res) => {
    const event = await events.findOne({ id: req.params.eventId });
    if (!event) throw notFound('EVENT_NOT_FOUND', 'Không tìm thấy sự kiện.');

    const registrations = db.collection<RegistrationDocument>('registrations');
    const users = db.collection<UserDocument>('users');

    const regList = await registrations.find({ eventId: event.id }).toArray();
    const userIds = regList.map((r) => r.userId);
    const userList = await users.find({ _id: { $in: userIds } }).toArray();
    const userMap = new Map(userList.map((u) => [u._id.toHexString(), u]));

    const header = '\uFEFFSTT,Mã số sinh viên,Họ và tên,Email,Khoa/Chuyên ngành,Thời gian điểm danh,Trạng thái\n';
    const rows = regList.map((r, idx) => {
      const u = userMap.get(r.userId.toHexString());
      const studentId = u?.studentId || 'Chưa cập nhật';
      const name = u?.name || 'Sinh viên IUH';
      const email = u?.email || '';
      const major = u?.major || 'Công nghệ Thông tin';
      const time = r.checkedInAt ? new Date(r.checkedInAt).toLocaleString('vi-VN') : 'Chưa điểm danh';
      const statusText = r.status === 'checked-in' ? 'Đã điểm danh' : 'Đã đăng ký (chưa điểm danh)';
      return `${idx + 1},"${studentId}","${name}","${email}","${major}","${time}","${statusText}"`;
    });

    const csvContent = header + rows.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${event.id}.csv"`);
    res.send(csvContent);
  });

  router.patch('/:eventId/status', async (req, res) => {
    const { status } = eventStatusSchema.parse(req.body);
    const event = await events.findOne({ id: req.params.eventId });
    if (!event) throw notFound('EVENT_NOT_FOUND', 'Không tìm thấy sự kiện.');

    const now = new Date();
    await events.updateOne(
      { id: event.id },
      {
        $set: {
          status,
          updatedAt: now,
          ...(status === 'archived' ? { archivedAt: now } : { archivedAt: null }),
        },
      },
    );
    const updated = await events.findOne({ id: event.id });
    res.json({ data: toPublicEvent(updated!) });
  });

  router.patch('/:eventId', async (req, res) => {
    const input = updateEventSchema.parse(req.body);
    const event = await events.findOne({ id: req.params.eventId });
    if (!event) throw notFound('EVENT_NOT_FOUND', 'Không tìm thấy sự kiện.');

    if (input.capacity !== undefined && input.capacity < event.registeredCount) {
      throw conflict('CAPACITY_BELOW_REGISTRATIONS', 'Sức chứa không thể thấp hơn số lượt đăng ký hiện tại.');
    }

    const { startsAt, ...otherUpdates } = input;
    const updates: Partial<EventDocument> = { ...otherUpdates, updatedAt: new Date() };
    if (startsAt) updates.startsAt = new Date(startsAt);
    await events.updateOne({ id: event.id }, { $set: updates });

    // Tự động gửi thông báo đổi phòng/đổi giờ tới các sinh viên đã đăng ký
    const isLocationChanged = input.location && input.location !== event.location;
    const isTimeChanged = startsAt && new Date(startsAt).getTime() !== new Date(event.startsAt).getTime();

    if (isLocationChanged || isTimeChanged) {
      try {
        const registrations = db.collection<RegistrationDocument>('registrations');
        const notifications = db.collection('notifications');
        const regStudents = await registrations.find({ eventId: event.id, status: { $in: ['registered', 'checked-in'] } }).toArray();

        if (regStudents.length > 0) {
          const notifDocs = regStudents.map((r) => ({
            userId: r.userId,
            eventId: event.id,
            title: `📢 Đổi lịch: ${event.title}`,
            body: isTimeChanged && isLocationChanged
              ? `Sự kiện đã đổi sang ${new Date(startsAt!).toLocaleString('vi-VN')} tại ${input.location}.`
              : isLocationChanged
                ? `Địa điểm mới của sự kiện: ${input.location}. Hãy đến đúng địa điểm mới nhé!`
                : `Thời gian mới của sự kiện: ${new Date(startsAt!).toLocaleString('vi-VN')}.`,
            type: 'event',
            read: false,
            createdAt: new Date(),
          }));
          await notifications.insertMany(notifDocs);
        }
      } catch (err) {
        console.warn('Failed to notify students on event update:', err);
      }
    }

    const updated = await events.findOne({ id: event.id });
    res.json({ data: toPublicEvent(updated!) });
  });

  return router;
}
