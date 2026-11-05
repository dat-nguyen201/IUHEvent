import { apiRequest } from '@/services/apiClient';
import { getRemoteAccessToken } from '@/services/remoteAuthService';
import type { AuthUser, UserStatus } from '@/types/auth';

export type AdminUsersPage = {
  data: AuthUser[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

async function adminRequest<T>(path: string, options: Parameters<typeof apiRequest<T>>[1] = {}) {
  const token = await getRemoteAccessToken();
  return apiRequest<T>(path, { ...options, token });
}

export function listAdminUsers({
  page,
  pageSize = 20,
  query,
  status,
}: {
  page: number;
  pageSize?: number;
  query?: string;
  status?: UserStatus | 'all';
}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (query?.trim()) params.set('query', query.trim());
  if (status && status !== 'all') params.set('status', status);
  return adminRequest<AdminUsersPage>(`/api/admin/users?${params.toString()}`);
}

export function getAdminUser(userId: string) {
  return adminRequest<{ user: AuthUser }>(`/api/admin/users/${encodeURIComponent(userId)}`);
}

export function updateAdminUserProfile(
  userId: string,
  input: Pick<AuthUser, 'name' | 'studentId' | 'major'>,
) {
  return adminRequest<{ user: AuthUser }>(
    `/api/admin/users/${encodeURIComponent(userId)}/profile`,
    { method: 'PATCH', body: input },
  );
}

export function updateAdminUserStatus(userId: string, status: UserStatus) {
  return adminRequest<{ user: AuthUser }>(
    `/api/admin/users/${encodeURIComponent(userId)}/status`,
    { method: 'PATCH', body: { status } },
  );
}
