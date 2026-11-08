import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload } from 'jsonwebtoken';

const BCRYPT_ROUNDS = 12;
const TOKEN_TTL = '12h';

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }
  return secret;
}

export function signAccessToken(userId: string, credentialVersion = 0) {
  return jwt.sign({ sub: userId, credentialVersion }, jwtSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyAccessToken(token: string) {
  const decoded = jwt.verify(token, jwtSecret());
  if (typeof decoded === 'string' || typeof (decoded as JwtPayload).sub !== 'string') {
    throw new Error('Invalid token subject.');
  }
  const payload = decoded as JwtPayload;
  const credentialVersion = payload.credentialVersion;
  if (credentialVersion !== undefined && (!Number.isInteger(credentialVersion) || credentialVersion < 0)) {
    throw new Error('Invalid token version.');
  }
  return {
    userId: payload.sub as string,
    credentialVersion: typeof credentialVersion === 'number' ? credentialVersion : 0,
  };
}
