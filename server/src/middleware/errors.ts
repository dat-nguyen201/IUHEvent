import type { ErrorRequestHandler } from 'express';
import { MongoServerError } from 'mongodb';
import { ZodError } from 'zod';

import { HttpError } from '../lib/errors';

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ code: error.code, message: error.message });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: error.issues[0]?.message ?? 'Dữ liệu gửi lên không hợp lệ.',
      details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  if (error instanceof MongoServerError && error.code === 11000) {
    const key = Object.keys(error.keyPattern ?? {})[0];
    const code = key === 'studentId' ? 'STUDENT_ID_EXISTS' : key === 'email' ? 'EMAIL_EXISTS' : 'DUPLICATE_RECORD';
    const message = key === 'studentId'
      ? 'Mã sinh viên đã được sử dụng.'
      : key === 'email'
        ? 'Email đã được đăng ký.'
        : 'Dữ liệu này đã tồn tại.';
    res.status(409).json({ code, message });
    return;
  }

  console.error('[api] Unhandled request error:', error);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Máy chủ gặp lỗi. Hãy thử lại sau.' });
};
