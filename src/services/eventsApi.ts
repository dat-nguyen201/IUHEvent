import type { ImageSourcePropType } from "react-native";

import { studentEvents } from "@/data/events";
import { appMode } from "@/constants/app-mode";
import { apiRequest } from "@/services/apiClient";
import type { EventDataSource, EventDto, EventsResponse } from "@/types/api";
import type { StudentEvent } from "@/types/events";

/**
 * Mock API: file JSON trong repo (mock-api/events.json) được phục vụ qua GitHub raw.
 * Có thể ghi đè bằng biến môi trường EXPO_PUBLIC_EVENTS_API_URL.
 */
export const EVENTS_API_URL =
  process.env.EXPO_PUBLIC_EVENTS_API_URL ??
  "https://raw.githubusercontent.com/dat-nguyen201/IUHEvent/main/mock-api/events.json";

const REQUEST_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 60_000;

const localImages: Record<string, ImageSourcePropType> = {
  "anh01.png": require("@/IMG/anh01.png"),
  "anh02.png": require("@/IMG/anh02.png"),
  "anh03.png": require("@/IMG/anh03.png"),
  "anh04.png": require("@/IMG/anh04.png"),
  "anh05.png": require("@/IMG/anh05.png"),
  "anh06.png": require("@/IMG/anh06.png"),
};
const defaultImage = localImages["anh01.png"];

let cache: {
  events: StudentEvent[];
  source: EventDataSource;
  at: number;
} | null = null;
let inFlight: Promise<{
  events: StudentEvent[];
  source: EventDataSource;
}> | null = null;
let cacheVersion = 0;

/** Làm mới dữ liệu sau khi admin thay đổi sự kiện. */
export function invalidateEventsCache() {
  cacheVersion++;
  cache = null;
  inFlight = null;
}

function isEventDto(value: unknown): value is EventDto {
  const v = value as EventDto;
  return (
    !!v &&
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    typeof v.startsAt === "string" &&
    typeof v.location === "string" &&
    typeof v.category === "string"
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
    description: dto.description ?? "",
    startsAt: dto.startsAt,
    location: dto.location,
    category: dto.category,
    organizer: dto.organizer ?? "",
    image,
    capacity: Number(dto.capacity) || 0,
    registeredCount: Number(dto.registeredCount) || 0,
    remainingSpots: Number(dto.remainingSpots) || Math.max(0, Number(dto.capacity) - Number(dto.registeredCount || 0)),
    checkedInCount: Number(dto.checkedInCount) || 0,
    summarySource: dto.summarySource ?? "",
  };
}

async function fetchRemoteEvents(): Promise<StudentEvent[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(EVENTS_API_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = (await response.json()) as EventsResponse;
    if (!json || !Array.isArray(json.data))
      throw new Error("Response không hợp lệ");
    return json.data.filter(isEventDto).map(mapEventDto);
  } finally {
    clearTimeout(timer);
  }
}

/** Phân trang public API remote; backend chỉ trả các sự kiện published. */
async function fetchPublishedEvents(): Promise<StudentEvent[]> {
  const results: StudentEvent[] = [];
  let page = 1;
  while (true) {
    const response = await apiRequest<EventsResponse & { hasMore?: boolean }>(
      `/api/events?page=${page}&pageSize=50`,
    );
    if (!response || !Array.isArray(response.data)) {
      throw new Error("API trả về dữ liệu sự kiện không hợp lệ.");
    }
    results.push(...response.data.filter(isEventDto).map(mapEventDto));
    if (!response.hasMore) return results;
    if (response.data.length === 0)
      throw new Error("API phân trang sự kiện không hợp lệ.");
    page++;
  }
}

/**
 * demo: giữ nguyên cách dùng API JSON và fallback hiện tại.
 * remote: gọi Express API, tuyệt đối không tự thay bằng dữ liệu demo khi lỗi.
 */
export async function fetchAllEvents(options: { force?: boolean } = {}) {
  if (!options.force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { events: cache.events, source: cache.source };
  }
  if (inFlight) return inFlight;

  const version = cacheVersion;
  const task = (async (): Promise<{
    events: StudentEvent[];
    source: EventDataSource;
  }> => {
    if (appMode === "remote") {
      const events = await fetchPublishedEvents();
      if (version === cacheVersion)
        cache = { events, source: "remote", at: Date.now() };
      return { events, source: "remote" };
    }
    try {
      const events = await fetchRemoteEvents();
      if (version === cacheVersion)
        cache = { events, source: "remote", at: Date.now() };
      return { events, source: "remote" };
    } catch (error) {
      console.warn(
        "[eventsApi] Dùng dữ liệu demo vì không gọi được API:",
        error,
      );
      if (version === cacheVersion)
        cache = { events: studentEvents, source: "fallback", at: Date.now() };
      return { events: studentEvents, source: "fallback" };
    }
  })();
  inFlight = task;
  try {
    return await task;
  } finally {
    if (inFlight === task) inFlight = null;
  }
}

export function cacheStudentEvents(newEvents: StudentEvent[], source: EventDataSource = 'remote') {
  const existing = cache?.events ?? studentEvents;
  const map = new Map(existing.map((e) => [e.id, e]));
  for (const event of newEvents) {
    map.set(event.id, event);
  }
  cache = { events: Array.from(map.values()), source, at: Date.now() };
}

export function setCachedEvents(events: StudentEvent[], source: EventDataSource = 'remote') {
  cache = { events, source, at: Date.now() };
}

export function getCachedEvents(): StudentEvent[] {
  return cache?.events ?? (appMode === "demo" ? studentEvents : []);
}
