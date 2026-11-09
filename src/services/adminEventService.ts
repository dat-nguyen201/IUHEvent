/** Thành viên 3: mọi thao tác quản trị qua Express API, không truy cập DB từ app. */
import { appMode } from "@/constants/app-mode";
import { ApiError, apiRequest } from "@/services/apiClient";
import { invalidateEventsCache } from "@/services/eventsApi";
import { getRemoteAccessToken } from "@/services/remoteAuthService";
import type {
  AdminEvent,
  AdminEventFilter,
  AdminEventInput,
  AdminEventPage,
  AdminEventStatus,
} from "@/types/admin-events";

const EVENTS_ENDPOINT = "/api/admin/events";

async function getAdminToken() {
  if (appMode !== "remote") {
    throw new ApiError(
      "FORBIDDEN",
      "Quản trị sự kiện chỉ hoạt động ở chế độ remote.",
    );
  }
  const token = await getRemoteAccessToken();
  if (!token)
    throw new ApiError(
      "UNAUTHORIZED",
      "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.",
      401,
    );
  return token;
}

function eventPath(id: string) {
  return `${EVENTS_ENDPOINT}/${encodeURIComponent(id)}`;
}

export async function listAdminEvents(
  filters: AdminEventFilter = {},
): Promise<AdminEventPage> {
  const token = await getAdminToken();
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 10));
  if (filters.query?.trim()) params.set("query", filters.query.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.timeRange && filters.timeRange !== "all") {
    params.set("timeRange", filters.timeRange);
  }
  if (filters.participantRange && filters.participantRange !== "all") {
    params.set("participantRange", filters.participantRange);
  }
  if (filters.ratingRange && filters.ratingRange !== "all") {
    params.set("ratingRange", filters.ratingRange);
  }
  if (filters.sortBy && filters.sortBy !== "date_desc") {
    params.set("sortBy", filters.sortBy);
  }
  return apiRequest<AdminEventPage>(`${EVENTS_ENDPOINT}?${params.toString()}`, {
    token,
  });
}

export async function getAdminEvent(id: string): Promise<AdminEvent> {
  const token = await getAdminToken();
  const response = await apiRequest<{ data: AdminEvent }>(eventPath(id), {
    token,
  });
  return response.data;
}

export async function createAdminEvent(
  input: AdminEventInput,
): Promise<AdminEvent> {
  const token = await getAdminToken();
  const result = await apiRequest<{ data: AdminEvent }>(EVENTS_ENDPOINT, {
    method: "POST",
    token,
    body: { ...input, status: "draft" },
  });
  invalidateEventsCache();
  return result.data;
}

export async function updateAdminEvent(
  id: string,
  input: AdminEventInput,
): Promise<AdminEvent> {
  const token = await getAdminToken();
  const result = await apiRequest<{ data: AdminEvent }>(eventPath(id), {
    method: "PATCH",
    token,
    body: input,
  });
  invalidateEventsCache();
  return result.data;
}

export async function setAdminEventStatus(
  id: string,
  status: AdminEventStatus,
): Promise<AdminEvent> {
  const token = await getAdminToken();
  const result = await apiRequest<{ data: AdminEvent }>(
    `${eventPath(id)}/status`,
    {
      method: "PATCH",
      token,
      body: { status },
    },
  );
  invalidateEventsCache();
  return result.data;
}

export interface AttendanceRecord {
  studentId: string;
  name: string;
  email: string;
  major: string;
  status: string;
  registeredAt?: string;
  checkedInAt?: string | null;
}

export async function getEventAttendance(id: string): Promise<{
  data: AttendanceRecord[];
  total: number;
  checkedInTotal: number;
}> {
  const token = await getAdminToken();
  return apiRequest<{
    data: AttendanceRecord[];
    total: number;
    checkedInTotal: number;
  }>(`${eventPath(id)}/attendance`, { token });
}

// Đặt tất cả giá trị trong dấu nháy kép; thoát dấu nháy kép và
// ngăn Excel diễn giải nội dung do người dùng nhập thành công thức.
function csvCell(value: string | number): string {
  const raw = String(value ?? "");
  const safe = /^[\s]*[=+@-]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function generateAttendanceCsv(
  _eventTitle: string,
  items: AttendanceRecord[],
): string {
  const header =
    "STT,Mã số sinh viên,Họ và tên,Email,Khoa/Chuyên ngành,Thời gian điểm danh,Trạng thái";
  const rows = items.map((item, idx) => {
    const timestamp = item.checkedInAt ? new Date(item.checkedInAt) : null;
    const time =
      timestamp && !Number.isNaN(timestamp.getTime())
        ? timestamp.toLocaleString("vi-VN")
        : "Chưa điểm danh";
    const status =
      item.status === "checked-in"
        ? "Đã điểm danh"
        : item.status === "cancelled"
          ? "Đã hủy đăng ký"
          : "Đã đăng ký (chưa điểm danh)";
    return [
      idx + 1,
      item.studentId,
      item.name,
      item.email,
      item.major,
      time,
      status,
    ]
      .map(csvCell)
      .join(",");
  });
  // BOM cho Excel đọc tiếng Việt, CRLF cho định dạng CSV chuẩn trên Windows.
  return "\uFEFF" + [header, ...rows].join("\r\n") + "\r\n";
}

export function getAdminEventError(error: unknown) {
  if (error instanceof ApiError) {
    const labels: Record<string, string> = {
      UNAUTHORIZED: "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại.",
      FORBIDDEN: "Bạn không có quyền quản trị sự kiện.",
      ACCOUNT_SUSPENDED: "Tài khoản đã bị khóa.",
      EVENT_NOT_FOUND: "Không tìm thấy sự kiện. Danh sách có thể đã thay đổi.",
      CAPACITY_BELOW_REGISTRATIONS:
        "Sức chứa phải lớn hơn hoặc bằng số lượt đã đăng ký.",
      VALIDATION_ERROR: "Dữ liệu chưa hợp lệ. Hãy kiểm tra các trường đã nhập.",
      NETWORK_ERROR:
        "Không kết nối được API. Hãy kiểm tra mạng và địa chỉ server.",
      REQUEST_TIMEOUT: "Máy chủ phản hồi quá lâu. Hãy thử lại.",
    };
    return labels[error.code] ?? error.message;
  }
  return error instanceof Error
    ? error.message
    : "Có lỗi xảy ra. Vui lòng thử lại.";
}
