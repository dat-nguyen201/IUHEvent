import type { AdminEvent, AdminEventInput } from "@/types/admin-events";
import type { EventCategory } from "@/types/events";

export const ADMIN_CATEGORIES: EventCategory[] = [
  "Học thuật",
  "CLB",
  "Tình nguyện",
  "Giải trí",
];

export type AdminEventFormValues = {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: EventCategory;
  organizer: string;
  capacity: string;
  summarySource: string;
  imageKey: string;
  imageUrl: string;
};
export type AdminEventFormErrors = Partial<
  Record<keyof AdminEventFormValues, string>
>;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function getInitialEventValues(
  event?: AdminEvent,
): AdminEventFormValues {
  const d = event
    ? new Date(event.startsAt)
    : new Date(Date.now() + 86_400_000);
  const valid = Number.isFinite(d.getTime()) ? d : new Date();
  return {
    title: event?.title ?? "",
    description: event?.description ?? "",
    date: `${valid.getFullYear()}-${pad(valid.getMonth() + 1)}-${pad(valid.getDate())}`,
    time: `${pad(valid.getHours())}:${pad(valid.getMinutes())}`,
    location: event?.location ?? "",
    category: event?.category ?? "Học thuật",
    organizer: event?.organizer ?? "",
    capacity: event ? String(event.capacity) : "100",
    summarySource: event?.summarySource ?? "",
    imageKey: event?.imageKey ?? "",
    imageUrl: event?.imageUrl ?? "",
  };
}

/** Nhập giờ theo giờ địa phương của thiết bị; gửi UTC ISO 8601 cho backend. */
function parseLocalTime(date: string, time: string): Date | undefined {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const timeParts = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!dateParts || !timeParts) return undefined;
  const [, yearText, monthText, dayText] = dateParts;
  const [, hourText, minuteText] = timeParts;
  const year = Number(yearText),
    month = Number(monthText),
    day = Number(dayText);
  const hour = Number(hourText),
    minute = Number(minuteText);
  if (year < 2000 || year > 2100 || hour > 23 || minute > 59) return undefined;
  const value = new Date(year, month - 1, day, hour, minute);
  if (
    value.getFullYear() !== year ||
    value.getMonth() + 1 !== month ||
    value.getDate() !== day ||
    value.getHours() !== hour ||
    value.getMinutes() !== minute
  )
    return undefined;
  return value;
}

export function validateAdminEventForm(values: AdminEventFormValues): {
  errors: AdminEventFormErrors;
  input?: AdminEventInput;
} {
  const errors: AdminEventFormErrors = {};
  const title = values.title.trim(),
    description = values.description.trim();
  const location = values.location.trim(),
    organizer = values.organizer.trim();
  const capacityText = values.capacity.trim();
  const capacity = Number(capacityText);
  const date = parseLocalTime(values.date, values.time);
  if (title.length < 3 || title.length > 160)
    errors.title = "Tiêu đề phải có 3–160 ký tự.";
  if (description.length < 1 || description.length > 8000)
    errors.description = "Mô tả phải có 1–8000 ký tự.";
  if (!date) {
    errors.date = "Ngày không hợp lệ (YYYY-MM-DD).";
    errors.time = "Giờ không hợp lệ (HH:mm).";
  }
  if (location.length < 2 || location.length > 240)
    errors.location = "Địa điểm phải có 2–240 ký tự.";
  if (organizer.length < 2 || organizer.length > 160)
    errors.organizer = "Đơn vị tổ chức phải có 2–160 ký tự.";
  if (!ADMIN_CATEGORIES.includes(values.category))
    errors.category = "Vui lòng chọn danh mục hợp lệ.";
  if (
    !/^\d+$/.test(capacityText) ||
    !Number.isInteger(capacity) ||
    capacity < 1 ||
    capacity > 100_000
  ) {
    errors.capacity = "Sức chứa phải là số nguyên từ 1 đến 100000.";
  }
  if (values.summarySource.trim().length > 8000)
    errors.summarySource = "Nội dung nguồn tối đa 8000 ký tự.";
  if (values.imageKey.trim().length > 120)
    errors.imageKey = "Tên ảnh tối đa 120 ký tự.";
  const imageUrl = values.imageUrl.trim();
  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl);
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        imageUrl.length > 2048
      )
        throw new Error("invalid");
    } catch {
      errors.imageUrl = "URL ảnh phải là http(s) hợp lệ, tối đa 2048 ký tự.";
    }
  }
  if (Object.keys(errors).length || !date) return { errors };
  return {
    errors,
    input: {
      title,
      description,
      startsAt: date.toISOString(),
      location,
      category: values.category,
      organizer,
      capacity,
      summarySource: values.summarySource.trim(),
      ...(values.imageKey.trim() ? { imageKey: values.imageKey.trim() } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    },
  };
}
