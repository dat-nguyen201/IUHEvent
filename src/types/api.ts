import type { EventCategory } from '@/types/events';

/** Một sự kiện như API trả về (chưa có ảnh dạng require, chỉ có khóa/URL ảnh). */
export type EventDto = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  category: EventCategory;
  organizer: string;
  capacity: number;
  checkedInCount: number;
  summarySource: string;
  /** Tên file ảnh có sẵn trong app (vd: `anh01.png`). */
  imageKey?: string;
  /** URL ảnh từ xa, ưu tiên hơn imageKey nếu có. */
  imageUrl?: string;
};

/** Cấu trúc response của endpoint danh sách sự kiện. */
export type EventsResponse = {
  data: EventDto[];
  total: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  source?: string;
};

export type EventDetailResponse = {
  data: EventDto;
};

export type SavedEventItemDto = {
  eventId: string;
  savedAt: string;
  event: EventDto;
};

export type SavedEventsResponse = {
  data: SavedEventItemDto[];
};

export type RegistrationItemDto = {
  eventId: string;
  status: 'registered' | 'cancelled' | 'checked-in';
  registeredAt: string;
  checkedInAt?: string;
  event: EventDto | null;
};

export type RegistrationsResponse = {
  data: RegistrationItemDto[];
};

/** Nguồn dữ liệu thực tế đã dùng cho lần tải gần nhất. */
export type EventDataSource = 'remote' | 'fallback';
