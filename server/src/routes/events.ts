import { Router } from 'express';
import { type Db, type Filter } from 'mongodb';

import { notFound } from '../lib/errors';
import { reviewSchema } from '../lib/validation';
import { requireAuth } from '../middleware/auth';
import type { EventDocument, ReviewDocument } from '../types/domain';
import { toPublicEvent } from '../types/domain';

function queryString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function pageNumber(value: unknown, fallback: number, max: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? Math.min(number, max) : fallback;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createEventsRouter(db: Db) {
  const router = Router();
  const events = db.collection<EventDocument>('events');
  const reviews = db.collection<ReviewDocument>('reviews');

  router.get('/', async (req, res) => {
    const page = pageNumber(req.query.page, 1, 1_000_000);
    const pageSize = pageNumber(req.query.pageSize, 10, 50);
    const query = queryString(req.query.query);
    const category = queryString(req.query.category);
    const organizer = queryString(req.query.organizer);
    const upcomingOnly = req.query.upcomingOnly === 'true';
    const filter: Filter<EventDocument> = { status: 'published' };

    if (query) {
      const escaped = escapeRegExp(query);
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { location: { $regex: escaped, $options: 'i' } },
        { organizer: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (category) filter.category = category as EventDocument['category'];
    if (organizer) filter.organizer = { $regex: escapeRegExp(organizer), $options: 'i' };
    if (upcomingOnly) filter.startsAt = { $gt: new Date() };

    const [total, rows] = await Promise.all([
      events.countDocuments(filter),
      events.find(filter).sort({ startsAt: 1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
    ]);
    res.json({
      data: rows.map(toPublicEvent),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
      source: 'remote',
    });
  });

  router.get('/:eventId', async (req, res) => {
    const event = await events.findOne({ id: req.params.eventId, status: 'published' });
    if (!event) throw notFound('EVENT_NOT_FOUND', 'Không tìm thấy sự kiện.');
    res.json({ data: toPublicEvent(event) });
  });

  router.get('/:eventId/reviews', async (req, res) => {
    const eventId = String(req.params.eventId);
    const event = await events.findOne({ id: eventId });
    if (!event) throw notFound('EVENT_NOT_FOUND', 'Không tìm thấy sự kiện.');

    const list = await reviews
      .find({ eventId })
      .sort({ createdAt: -1 })
      .toArray();

    const total = list.length;
    const avg = total > 0 ? Number((list.reduce((acc, cur) => acc + cur.rating, 0) / total).toFixed(1)) : 5.0;

    res.json({
      data: list.map((r) => ({
        id: r._id?.toHexString() || `${r.userId}-${r.eventId}`,
        studentName: r.userName,
        studentId: r.userStudentId,
        rating: r.rating,
        tags: r.tags || [],
        comment: r.comment || '',
        createdAt: r.createdAt.toISOString(),
      })),
      averageRating: avg,
      totalReviews: total,
    });
  });

  router.post('/:eventId/reviews', requireAuth(db), async (req, res) => {
    const eventId = String(req.params.eventId);
    const event = await events.findOne({ id: eventId });
    if (!event) throw notFound('EVENT_NOT_FOUND', 'Không tìm thấy sự kiện.');

    const input = reviewSchema.parse(req.body);
    const userId = req.authUser!._id;
    const now = new Date();

    const reviewDoc: ReviewDocument = {
      eventId,
      userId,
      userName: req.authUser!.name || 'Sinh viên IUH',
      userStudentId: req.authUser!.studentId || '21000001',
      rating: input.rating,
      tags: input.tags,
      comment: input.comment,
      createdAt: now,
      updatedAt: now,
    };

    await reviews.updateOne(
      { eventId, userId },
      { $set: reviewDoc },
      { upsert: true },
    );

    const list = await reviews.find({ eventId }).toArray();
    const total = list.length;
    const avg = Number((list.reduce((acc, cur) => acc + cur.rating, 0) / total).toFixed(1));

    res.status(201).json({
      message: 'Đánh giá đã được ghi nhận thành công!',
      averageRating: avg,
      totalReviews: total,
    });
  });

  return router;
}
