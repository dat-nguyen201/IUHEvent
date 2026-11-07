import type {
  AuthUser,
  RegisterInput,
  UserRole,
  UserStatus,
} from "@/types/auth";
import { ApiError, apiRequest } from "@/services/apiClient";
import {
  getStoredValue,
  removeStoredValue,
  setStoredValue,
} from "@/services/authStorage";

const REMOTE_TOKEN_KEY = "iuh-event-remote-access-token";

/** Cùng token đã xác thực; quyền admin vẫn luôn được backend kiểm tra. */
export function getRemoteAccessToken() {
  return getStoredValue(REMOTE_TOKEN_KEY);
}

type AuthResponse = { accessToken: string; user: unknown };
type SessionResponse = { user: unknown };

function parseUser(value: unknown): AuthUser {
  if (!value || typeof value !== "object") {
    throw new ApiError(
      "INVALID_RESPONSE",
      "Máy chủ trả về hồ sơ không hợp lệ.",
    );
  }

  const user = value as Record<string, unknown>;
  const role = user.role;
  const status = user.status;
  if (
    typeof user.id !== "string" ||
    typeof user.name !== "string" ||
    typeof user.studentId !== "string" ||
    typeof user.email !== "string" ||
    typeof user.major !== "string" ||
    (role !== "student" && role !== "admin") ||
    (status !== "active" && status !== "suspended")
  ) {
    throw new ApiError(
      "INVALID_RESPONSE",
      "Máy chủ trả về hồ sơ thiếu thông tin cần thiết.",
    );
  }

  return {
    id: user.id,
    name: user.name,
    studentId: user.studentId,
    email: user.email,
    major: user.major,
    role: role as UserRole,
    status: status as UserStatus,
  };
}

async function saveAuthResponse(response: AuthResponse) {
  if (typeof response?.accessToken !== "string" || !response.accessToken) {
    throw new ApiError(
      "INVALID_RESPONSE",
      "Máy chủ không trả về phiên đăng nhập hợp lệ.",
    );
  }

  const user = parseUser(response.user);
  if (user.status !== "active") {
    throw new ApiError(
      "ACCOUNT_SUSPENDED",
      "Tài khoản hiện không được phép đăng nhập.",
    );
  }

  await setStoredValue(REMOTE_TOKEN_KEY, response.accessToken);
  return user;
}

export async function registerRemoteAccount(input: RegisterInput) {
  const response = await apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: {
      name: input.name.trim(),
      studentId: input.studentId.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
    },
  });
  return saveAuthResponse(response);
}

export async function loginRemoteAccount(emailInput: string, password: string) {
  const response = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: { email: emailInput.trim().toLowerCase(), password },
  });
  return saveAuthResponse(response);
}

export async function getRemoteToken(): Promise<string | null> {
  return getStoredValue(REMOTE_TOKEN_KEY);
}

export async function getRemoteAuthSession(): Promise<AuthUser | null> {
  const token = await getStoredValue(REMOTE_TOKEN_KEY);
  if (!token) return null;

  try {
    const response = await apiRequest<SessionResponse>("/api/auth/me", {
      token,
    });
    const user = parseUser(response?.user);
    if (user.status !== "active") {
      await removeStoredValue(REMOTE_TOKEN_KEY);
      throw new ApiError(
        "ACCOUNT_SUSPENDED",
        "Tài khoản hiện không được phép truy cập.",
      );
    }
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await removeStoredValue(REMOTE_TOKEN_KEY);
      return null;
    }
    throw error;
  }
}

export async function logoutRemoteAccount() {
  await removeStoredValue(REMOTE_TOKEN_KEY);
}

export function getRemoteAccessToken() {
  return getStoredValue(REMOTE_TOKEN_KEY);
}
