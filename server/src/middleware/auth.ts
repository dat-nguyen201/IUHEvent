import { ObjectId, type Db } from 'mongodb';
import type { RequestHandler } from 'express';

import { forbidden, unauthorized } from '../lib/errors';
import { verifyAccessToken } from '../lib/security';
import type { UserDocument } from '../types/domain';

export function requireAuth(db: Db): RequestHandler {
  return async (req, _res, next) => {
    try {
      const authorization = req.get('authorization');
      const match = authorization?.match(/^Bearer\s+(.+)$/i);
      if (!match) throw unauthorized();

      let userId: string;
      try {
        userId = verifyAccessToken(match[1]);
      } catch {
        throw unauthorized('INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
      }

      if (!ObjectId.isValid(userId)) {
        throw unauthorized('INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ.');
      }

      const user = await db.collection<UserDocument>('users').findOne({ _id: new ObjectId(userId) });
      if (!user) throw unauthorized();
      if (user.status !== 'active') {
        throw forbidden('ACCOUNT_SUSPENDED', 'Tài khoản đang bị khóa.');
      }

      req.authUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.authUser?.role !== 'admin') {
    next(forbidden());
    return;
  }
  next();
};

export const requireAdminOrOrganizer: RequestHandler = (req, _res, next) => {
  if (req.authUser?.role !== 'admin' && req.authUser?.role !== 'organizer') {
    next(forbidden());
    return;
  }
  next();
};
