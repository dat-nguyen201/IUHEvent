import * as Crypto from 'expo-crypto';

import { getStoredValue, removeStoredValue, setStoredValue } from '@/services/authStorage';

export type DemoUser = {
  id: string;
  name: string;
  studentId: string;
  email: string;
  major: string;
};

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

const adminUser: DemoUser = {
  id: 'admin',
  name: 'Quản trị viên',
  studentId: 'ADMIN',
  email: 'admin@iuh.edu.vn',
  major: 'Quản trị hệ thống',
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
    return JSON.parse(value) as StoredAccount;
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

export async function registerDemoAccount(input: {
  name: string;
  studentId: string;
  email: string;
  password: string;
}) {
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
