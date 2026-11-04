import { Router } from 'express';
import { type Db } from 'mongodb';
import { rateLimit } from 'express-rate-limit';

import { conflict, forbidden, unauthorized } from '../lib/errors';
import { hashPassword, signAccessToken, verifyPassword } from '../lib/security';
import { loginSchema, registerSchema } from '../lib/validation';
import { requireAuth } from '../middleware/auth';
import { toPublicUser, type UserDocument } from '../types/domain';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Quá nhiều lần thử. Hãy đợi rồi thử lại.' },
});

export function createAuthRouter(db: Db) {
  const router = Router();
  const users = db.collection<UserDocument>('users');

  router.post('/register', authLimiter, async (req, res) => {
    const input = registerSchema.parse(req.body);
    const email = input.email;
    const studentId = input.studentId.trim().toUpperCase();
    const existing = await users.findOne({ $or: [{ email }, { studentId }] }, { projection: { email: 1, studentId: 1 } });
    if (existing?.email === email) throw conflict('EMAIL_EXISTS', 'Email đã được đăng ký.');
    if (existing?.studentId === studentId) throw conflict('STUDENT_ID_EXISTS', 'Mã sinh viên đã được sử dụng.');

    const now = new Date();
    const user = {
      name: input.name,
      studentId,
      email,
      passwordHash: await hashPassword(input.password),
      major: 'Sinh viên IUH',
      role: 'student' as const,
      status: 'active' as const,
      createdAt: now,
      updatedAt: now,
    };
    const result = await users.insertOne(user);
    const storedUser = { ...user, _id: result.insertedId };
    res.status(201).json({ accessToken: signAccessToken(result.insertedId.toHexString()), user: toPublicUser(storedUser) });
  });

  router.post('/login', authLimiter, async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await users.findOne({ email: input.email });
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw unauthorized('INVALID_CREDENTIALS', 'Email hoặc mật khẩu chưa chính xác.');
    }
    if (user.status !== 'active') throw forbidden('ACCOUNT_SUSPENDED', 'Tài khoản đang bị khóa.');

    res.json({ accessToken: signAccessToken(user._id.toHexString()), user: toPublicUser(user) });
  });

  router.get('/me', requireAuth(db), (req, res) => {
    res.json({ user: toPublicUser(req.authUser!) });
  });

  return router;
}
