import { Router } from 'express';
import { ObjectId, type Db, type Filter } from 'mongodb';

import { conflict, notFound } from '../lib/errors';
import { profileSchema, userStatusSchema } from '../lib/validation';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { toPublicUser, type UserDocument } from '../types/domain';

function pageNumber(value: unknown, fallback: number, max: number) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? Math.min(number, max) : fallback;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseId(value: string) {
  if (!ObjectId.isValid(value)) throw notFound('USER_NOT_FOUND', 'Không tìm thấy người dùng.');
  return new ObjectId(value);
}

export function createAdminUsersRouter(db: Db) {
  const router = Router();
  const users = db.collection<UserDocument>('users');
  router.use(requireAuth(db), requireAdmin);

  router.get('/', async (req, res) => {
    const page = pageNumber(req.query.page, 1, 1_000_000);
    const pageSize = pageNumber(req.query.pageSize, 20, 100);
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const filter: Filter<UserDocument> = {};
    if (status === 'active' || status === 'suspended') filter.status = status;
    if (query) {
      const escaped = escapeRegExp(query);
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { studentId: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [total, rows] = await Promise.all([
      users.countDocuments(filter),
      users.find(filter, { projection: { passwordHash: 0 } })
        .sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
    ]);
    res.json({ data: rows.map(toPublicUser), total, page, pageSize, hasMore: page * pageSize < total });
  });

  router.get('/:userId', async (req, res) => {
    const user = await users.findOne({ _id: parseId(req.params.userId) });
    if (!user) throw notFound('USER_NOT_FOUND', 'Không tìm thấy người dùng.');
    res.json({ user: toPublicUser(user) });
  });

  router.patch('/:userId/profile', async (req, res) => {
    const input = profileSchema.parse(req.body);
    const userId = parseId(req.params.userId);
    const result = await users.updateOne({ _id: userId }, { $set: { ...input, updatedAt: new Date() } });
    if (!result.matchedCount) throw notFound('USER_NOT_FOUND', 'Không tìm thấy người dùng.');
    const user = await users.findOne({ _id: userId });
    res.json({ user: toPublicUser(user!) });
  });

  router.patch('/:userId/status', async (req, res) => {
    const { status } = userStatusSchema.parse(req.body);
    const userId = parseId(req.params.userId);
    const target = await users.findOne({ _id: userId });
    if (!target) throw notFound('USER_NOT_FOUND', 'Không tìm thấy người dùng.');

    if (target.role === 'admin' && status === 'suspended') {
      if (target._id.equals(req.authUser!._id)) {
        throw conflict('CANNOT_SUSPEND_SELF', 'Bạn không thể tự khóa tài khoản admin đang sử dụng.');
      }
      const activeAdmins = await users.countDocuments({ role: 'admin', status: 'active' });
      if (activeAdmins <= 1) {
        throw conflict('LAST_ACTIVE_ADMIN', 'Không thể khóa admin hoạt động cuối cùng.');
      }
    }

    await users.updateOne({ _id: userId }, { $set: { status, updatedAt: new Date() } });
    const updated = await users.findOne({ _id: userId });
    res.json({ user: toPublicUser(updated!) });
  });

  return router;
}
