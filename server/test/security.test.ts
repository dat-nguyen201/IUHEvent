import assert from 'node:assert/strict';
import { test } from 'node:test';

import { registerSchema, profileSchema } from '../src/lib/validation';
import { hashPassword, verifyPassword, signAccessToken, verifyAccessToken } from '../src/lib/security';

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-unit-tests';

test('password hashing verifies the original password without storing plaintext', async () => {
  const hash = await hashPassword('CorrectHorse123');
  assert.notEqual(hash, 'CorrectHorse123');
  assert.equal(await verifyPassword('CorrectHorse123', hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
});

test('access token contains the user id and rejects invalid tokens', () => {
  const token = signAccessToken('507f1f77bcf86cd799439011');
  assert.equal(verifyAccessToken(token), '507f1f77bcf86cd799439011');
  assert.throws(() => verifyAccessToken('not-a-token'));
});

test('registration normalizes email and rejects invalid or privileged input', () => {
  const parsed = registerSchema.parse({
    name: 'Student Example', studentId: 'SV001', email: ' USER@EXAMPLE.COM ', password: 'password123',
  });
  assert.equal(parsed.email, 'user@example.com');
  assert.throws(() => registerSchema.parse({
    name: 'Student Example', studentId: 'SV001', email: 'user@example.com', password: 'short', role: 'admin',
  }));
});

test('profile updates cannot set a role and cannot be empty', () => {
  assert.throws(() => profileSchema.parse({ role: 'admin' }));
  assert.throws(() => profileSchema.parse({}));
  assert.deepEqual(profileSchema.parse({ major: 'Software Engineering' }), { major: 'Software Engineering' });
});
