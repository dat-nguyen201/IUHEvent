import { Router } from 'express';
import { type Db } from 'mongodb';
import { rateLimit } from 'express-rate-limit';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

import { conflict, forbidden, unauthorized } from '../lib/errors';
import { hashPassword, signAccessToken, verifyPassword } from '../lib/security';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../lib/validation';
import { requireAuth } from '../middleware/auth';
import { toPublicUser, type PasswordResetDocument, type UserDocument } from '../types/domain';
import { isPasswordResetMailConfigured, sendPasswordResetCode } from '../services/password-reset-mail';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Quá nhiều lần thử. Hãy đợi rồi thử lại.' },
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Quá nhiều yêu cầu khôi phục. Hãy thử lại sau.' },
});

const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;

function hashResetCode(email: string, code: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
  return createHmac('sha256', `${secret}:iuh-event-password-reset-v1`).update(`${email}:${code}`).digest('hex');
}

function sameHash(left: string, right: string) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createAuthRouter(db: Db) {
  const router = Router();
  const users = db.collection<UserDocument>('users');
  const passwordResets = db.collection<PasswordResetDocument>('passwordResets');

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

    res.json({ accessToken: signAccessToken(user._id.toHexString(), user.credentialVersion ?? 0), user: toPublicUser(user) });
  });

  router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    if (!isPasswordResetMailConfigured()) {
      res.status(503).json({ code: 'PASSWORD_RESET_NOT_CONFIGURED', message: 'Chức năng khôi phục mật khẩu chưa được cấu hình email.' });
      return;
    }

    const user = await users.findOne({ email, status: 'active' });
    if (user) {
      const code = String(randomInt(100_000, 1_000_000));
      const codeHash = hashResetCode(email, code);
      const now = new Date();
      await passwordResets.updateOne(
        { _id: email },
        { $set: { userId: user._id, codeHash, attempts: 0, createdAt: now, expiresAt: new Date(now.getTime() + RESET_CODE_TTL_MS) } },
        { upsert: true },
      );

      try {
        await sendPasswordResetCode(email, code);
      } catch (error) {
        await passwordResets.deleteOne({ _id: email, codeHash });
        console.error('[auth] Password reset email delivery failed:', error instanceof Error ? error.message : 'unknown error');
      }
    }

    res.json({ message: 'Nếu email thuộc tài khoản đang hoạt động, mã xác nhận sẽ được gửi đến hộp thư đó.' });
  });

  router.post('/reset-password', passwordResetLimiter, async (req, res) => {
    const { email, code, newPassword } = resetPasswordSchema.parse(req.body);
    const reset = await passwordResets.findOne({ _id: email });
    const now = new Date();
    if (!reset || reset.expiresAt <= now || reset.attempts >= RESET_MAX_ATTEMPTS) {
      throw unauthorized('INVALID_RESET_CODE', 'Mã xác nhận không đúng hoặc đã hết hạn.');
    }

    const submittedHash = hashResetCode(email, code);
    if (!sameHash(reset.codeHash, submittedHash)) {
      await passwordResets.updateOne(
        { _id: email, attempts: reset.attempts, expiresAt: { $gt: now } },
        { $inc: { attempts: 1 } },
      );
      throw unauthorized('INVALID_RESET_CODE', 'Mã xác nhận không đúng hoặc đã hết hạn.');
    }

    const consumed = await passwordResets.deleteOne({
      _id: email,
      codeHash: reset.codeHash,
      attempts: reset.attempts,
      expiresAt: { $gt: now },
    });
    if (!consumed.deletedCount) {
      throw unauthorized('INVALID_RESET_CODE', 'Mã xác nhận không đúng hoặc đã hết hạn.');
    }

    const updated = await users.updateOne(
      { _id: reset.userId, status: 'active' },
      { $set: { passwordHash: await hashPassword(newPassword), updatedAt: now }, $inc: { credentialVersion: 1 } },
    );
    if (!updated.matchedCount) throw unauthorized('INVALID_RESET_CODE', 'Mã xác nhận không đúng hoặc đã hết hạn.');
    await passwordResets.deleteMany({ userId: reset.userId });
    res.json({ message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.' });
  });

  router.get('/me', requireAuth(db), (req, res) => {
    res.json({ user: toPublicUser(req.authUser!) });
  });

  return router;
}
