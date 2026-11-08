import * as Crypto from 'expo-crypto';

import { getStoredValue, removeStoredValue, setStoredValue } from '@/services/authStorage';
import type { AuthUser, RegisterInput } from '@/types/auth';

export type DemoUser = AuthUser;

type StoredAccount = {
  user: DemoUser;
  salt: string;
  passwordHash: string;
};

const SESSION_KEY = 'iuh-event-demo-session';
const GET_STARTED_KEY = 'iuh-event-get-started-complete';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '123456789';
const ADMIN_SESSION = 'admin-demo';
const ORGANIZER_USERNAME = 'organizer';
const ORGANIZER_PASSWORD = '123456789';
const ORGANIZER_SESSION = 'organizer-demo';

const adminUser: DemoUser = {
  id: 'admin',
  name: 'Quản trị viên',
  studentId: 'ADMIN',
  role: 'admin',
  status: 'active',
  email: 'admin@iuh.edu.vn',
  major: 'Quản trị hệ thống',
};

const organizerUser: DemoUser = {
  id: 'organizer',
  name: 'Đơn vị Tổ chức Sự kiện',
  studentId: 'ORG-001',
  role: 'organizer',
  status: 'active',
  email: 'organizer@iuh.edu.vn',
  major: 'Ban Tổ chức',
};

async function accountStorageKey(email: string) {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, email);
  return `iuh-event-account-${digest}`;
}

async function getAccount(email: string): Promise<StoredAccount | null> {
  const key = await accountStorageKey(email);
  const value = await getStoredValue(key);
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<StoredAccount>;
    const user = parsed.user;
    if (
      !user ||
      typeof user.id !== 'string' ||
      typeof user.name !== 'string' ||
      typeof user.studentId !== 'string' ||
      typeof user.email !== 'string' ||
      typeof user.major !== 'string' ||
      typeof parsed.salt !== 'string' ||
      typeof parsed.passwordHash !== 'string'
    ) {
      await removeStoredValue(key);
      return null;
    }

    return {
      salt: parsed.salt,
      passwordHash: parsed.passwordHash,
      user: {
        id: user.id,
        name: user.name,
        studentId: user.studentId,
        email: user.email,
        major: user.major,
        role: user.role === 'admin' ? 'admin' : user.role === 'organizer' ? 'organizer' : 'student',
        status: user.status === 'suspended' ? 'suspended' : 'active',
      },
    };
  } catch {
    await removeStoredValue(key);
    return null;
  }
}

async function hashPassword(password: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

export async function getAuthSession() {
  const email = await getStoredValue(SESSION_KEY);
  if (!email) return null;
  if (email === ADMIN_SESSION) return adminUser;
  if (email === ORGANIZER_SESSION) return organizerUser;

  const account = await getAccount(email);
  if (!account) {
    await removeStoredValue(SESSION_KEY);
    return null;
  }
  return account.user;
}

export async function hasCompletedGetStarted() {
  return (await getStoredValue(GET_STARTED_KEY)) === 'true';
}

export async function registerDemoAccount(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  if (email === adminUser.email || await getAccount(email)) {
    throw new Error('EMAIL_EXISTS');
  }

  const salt = Array.from(await Crypto.getRandomBytesAsync(16), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const user: DemoUser = {
    id: `student-${Date.now()}`,
    name: input.name.trim(),
    studentId: input.studentId.trim(),
    email,
    major: 'Sinh viên IUH',
    role: 'student',
    status: 'active',
  };
  const account = { user, salt, passwordHash: await hashPassword(input.password, salt) };

  await setStoredValue(await accountStorageKey(email), JSON.stringify(account));
  await setStoredValue(SESSION_KEY, email);
  return user;
}

export async function loginDemoAccount(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  if (email === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    await setStoredValue(SESSION_KEY, ADMIN_SESSION);
    return adminUser;
  }
  if (email === ORGANIZER_USERNAME && password === ORGANIZER_PASSWORD) {
    await setStoredValue(SESSION_KEY, ORGANIZER_SESSION);
    return organizerUser;
  }

  const account = await getAccount(email);
  if (!account || (await hashPassword(password, account.salt)) !== account.passwordHash) {
    throw new Error('INVALID_CREDENTIALS');
  }

  await setStoredValue(SESSION_KEY, email);
  return account.user;
}

export async function logoutDemoAccount() {
  await removeStoredValue(SESSION_KEY);
}

export async function completeGetStarted() {
  await setStoredValue(GET_STARTED_KEY, 'true');
}
