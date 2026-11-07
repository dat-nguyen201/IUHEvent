import { appMode } from "@/constants/app-mode";
import { ApiError, apiRequest } from "@/services/apiClient";
import { getRemoteAccessToken } from "@/services/remoteAuthService";
import type { AuthUser, UserStatus } from "@/types/auth";

export type AdminUsersPage = {
  data: AuthUser[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};
type AdminUserProfile = { name: string; studentId: string; major: string };

async function token() {
  if (appMode !== "remote")
    throw new ApiError(
      "FORBIDDEN",
      "Tính năng quản trị chỉ khả dụng ở remote mode.",
    );
  const value = await getRemoteAccessToken();
  if (!value)
    throw new ApiError("UNAUTHORIZED", "Vui lòng đăng nhập lại.", 401);
  return value;
}
function path(id: string) {
  return `/api/admin/users/${encodeURIComponent(id)}`;
}

export async function listAdminUsers({
  page = 1,
  pageSize = 10,
  query = "",
  status,
}: {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: UserStatus | "all";
} = {}): Promise<AdminUsersPage> {
  const search = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (query.trim()) search.set("query", query.trim());
  if (status && status !== "all") search.set("status", status);
  return apiRequest<AdminUsersPage>(`/api/admin/users?${search.toString()}`, {
    token: await token(),
  });
}

export async function getAdminUser(id: string): Promise<AuthUser> {
  const response = await apiRequest<{ user: AuthUser }>(path(id), {
    token: await token(),
  });
  return response.user;
}

export async function updateAdminUserProfile(
  id: string,
  data: AdminUserProfile,
) {
  const response = await apiRequest<{ user: AuthUser }>(`${path(id)}/profile`, {
    token: await token(),
    method: "PATCH",
    body: data,
  });
  return response.user;
}

export async function setAdminUserStatus(id: string, status: UserStatus) {
  const response = await apiRequest<{ user: AuthUser }>(`${path(id)}/status`, {
    token: await token(),
    method: "PATCH",
    body: { status },
  });
  return response.user;
}

export const updateAdminUserStatus = setAdminUserStatus;

export function getAdminUserError(error: unknown) {
  if (error instanceof ApiError) {
    const labels: Record<string, string> = {
      UNAUTHORIZED: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.",
      FORBIDDEN: "Bạn không có quyền quản trị người dùng.",
      ACCOUNT_SUSPENDED: "Tài khoản đã bị khóa.",
      USER_NOT_FOUND: "Không tìm thấy người dùng.",
      STUDENT_ID_EXISTS: "Mã sinh viên đã được sử dụng.",
      CANNOT_SUSPEND_SELF: "Không thể tự khóa tài khoản admin đang đăng nhập.",
      LAST_ACTIVE_ADMIN: "Không thể khóa tài khoản admin hoạt động cuối cùng.",
      VALIDATION_ERROR: "Thông tin chưa hợp lệ.",
    };
    return labels[error.code] ?? error.message;
  }
  return error instanceof Error
    ? error.message
    : "Thao tác không thành công. Vui lòng thử lại.";
}
