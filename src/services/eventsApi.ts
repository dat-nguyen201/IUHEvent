import type { ImageSourcePropType } from 'react-native';

import { studentEvents } from '@/data/events';
import type { EventDataSource, EventDto, EventsResponse } from '@/types/api';
import type { StudentEvent } from '@/types/events';

/**
 * Mock API: file JSON trong repo (mock-api/events.json) được phục vụ qua GitHub raw.
 * Có thể ghi đè bằng biến môi trường EXPO_PUBLIC_EVENTS_API_URL.
 */
export const EVENTS_API_URL =
  process.env.EXPO_PUBLIC_EVENTS_API_URL ??
  'https://raw.githubusercontent.com/dat-nguyen201/IUHEvent/main/mock-api/events.json';

const REQUEST_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 60_000;

const localImages: Record<string, ImageSourcePropType> = {
  'anh01.png': require('@/IMG/anh01.png'),
  'anh02.png': require('@/IMG/anh02.png'),
  'anh03.png': require('@/IMG/anh03.png'),
  'anh04.png': require('@/IMG/anh04.png'),
  'anh05.png': require('@/IMG/anh05.png'),
  'anh06.png': require('@/IMG/anh06.png'),
};
const defaultImage = localImages['anh01.png'];

let cache: { events: StudentEvent[]; source: EventDataSource; at: number } | null = null;
let inFlight: Promise<{ events: StudentEvent[]; source: EventDataSource }> | null = null;

function isEventDto(value: unknown): value is EventDto {
  const v = value as EventDto;
  return (
    !!v &&
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.startsAt === 'string' &&
    typeof v.location === 'string' &&
    typeof v.category === 'string'
  );
}

/** Ánh xạ DTO từ API sang model StudentEvent mà UI đang dùng. */
export function mapEventDto(dto: EventDto): StudentEvent {
  const image: ImageSourcePropType = dto.imageUrl
    ? { uri: dto.imageUrl }
    : (dto.imageKey && localImages[dto.imageKey]) || defaultImage;

  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? '',
    startsAt: dto.startsAt,
    location: dto.location,
    category: dto.category,
    organizer: dto.organizer ?? '',
    image,
    capacity: Number(dto.capacity) || 0,
    checkedInCount: Number(dto.checkedInCount) || 0,
    summarySource: dto.summarySource ?? '',
  };
}

async function fetchRemoteEvents(): Promise<StudentEvent[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(EVENTS_API_URL, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = (await response.json()) as EventsResponse;
    if (!json || !Array.isArray(json.data)) throw new Error('Response không hợp lệ');
    return json.data.filter(isEventDto).map(mapEventDto);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lấy toàn bộ sự kiện: ưu tiên API, lỗi/mất mạng thì dùng dữ liệu demo trong app.
 * Có cache ngắn và gộp các request đồng thời để tránh gọi lặp.
 */
export async function fetchAllEvents(options: { force?: boolean } = {}) {
  if (!options.force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { events: cache.events, source: cache.source };
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const events = await fetchRemoteEvents();
      cache = { events, source: 'remote', at: Date.now() };
    } catch (error) {
      console.warn('[eventsApi] Dùng dữ liệu demo vì không gọi được API:', error);
      cache = { events: studentEvents, source: 'fallback', at: Date.now() };
    }
    return { events: cache.events, source: cache.source };
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function getCachedEvents(): StudentEvent[] {
  return cache?.events ?? studentEvents;
}
