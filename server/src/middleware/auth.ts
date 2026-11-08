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

      let claims: ReturnType<typeof verifyAccessToken>;
      try {
        claims = verifyAccessToken(match[1]);
      } catch {
        throw unauthorized('INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
      }

      if (!ObjectId.isValid(claims.userId)) {
        throw unauthorized('INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ.');
      }

      const user = await db.collection<UserDocument>('users').findOne({ _id: new ObjectId(claims.userId) });
      if (!user) throw unauthorized();
      if ((user.credentialVersion ?? 0) !== claims.credentialVersion) {
        throw unauthorized('SESSION_REVOKED', 'Mật khẩu đã thay đổi. Vui lòng đăng nhập lại.');
      }
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
