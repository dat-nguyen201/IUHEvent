import type { StoredUser } from './domain';

declare global {
  namespace Express {
    interface Request {
      authUser?: StoredUser;
    }
  }
}

export {};
