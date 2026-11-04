import { Router } from 'express';
import { ObjectId, type Db, type Filter } from 'mongodb';

import { conflict, notFound } from '../lib/errors';
import { createEventSchema, eventStatusSchema, updateEventSchema } from '../lib/validation';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { toPublicEvent, type EventDocument } from '../types/domain';

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

    const [total, rows] = await Promise.all([
      events.countDocuments(filter),
      events.find(filter).sort({ startsAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
    ]);
    res.json({ data: rows.map(toPublicEvent), total, page, pageSize, hasMore: page * pageSize < total });
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
    res.status(201).json({ data: toPublicEvent(event) });
  });

  router.get('/:eventId', async (req, res) => {
    const event = await events.findOne({ id: req.params.eventId });
    if (!event) throw notFound('EVENT_NOT_FOUND', 'Không tìm thấy sự kiện.');
    res.json({ data: toPublicEvent(event) });
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
    const updated = await events.findOne({ id: event.id });
    res.json({ data: toPublicEvent(updated!) });
  });

  return router;
}
