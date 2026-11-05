import { apiRequest, ApiError } from '@/services/apiClient';
import { getRemoteToken } from '@/services/remoteAuthService';
import { cacheStudentEvents, mapEventDto } from '@/services/eventsApi';
import type {
  EventDetailResponse,
  EventsResponse,
  RegistrationsResponse,
  SavedEventsResponse,
} from '@/types/api';
import type { EventCategory, EventPage, StudentEvent } from '@/types/events';

export type RemoteEventsParams = {
  page?: number;
  pageSize?: number;
  query?: string;
  category?: EventCategory;
  upcomingOnly?: boolean;
};

export async function fetchRemoteEvents({
  page = 1,
  pageSize = 10,
  query = '',
  category,
  upcomingOnly = false,
}: RemoteEventsParams): Promise<EventPage> {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('pageSize', String(pageSize));
  if (query.trim()) searchParams.set('query', query.trim());
  if (category) searchParams.set('category', category);
  if (upcomingOnly) searchParams.set('upcomingOnly', 'true');

  const queryString = searchParams.toString();
  const path = `/api/events${queryString ? `?${queryString}` : ''}`;
  const response = await apiRequest<EventsResponse>(path);

  const items = Array.isArray(response?.data) ? response.data.map(mapEventDto) : [];
  cacheStudentEvents(items, 'remote');

  return {
    items,
    page: response.page ?? page,
    hasMore: Boolean(response.hasMore),
    total: response.total ?? items.length,
    source: 'remote',
  };
}

export async function fetchRemoteEventById(id: string): Promise<StudentEvent | undefined> {
  try {
    const response = await apiRequest<EventDetailResponse>(`/api/events/${encodeURIComponent(id)}`);
    if (!response?.data) return undefined;
    const event = mapEventDto(response.data);
    cacheStudentEvents([event], 'remote');
    return event;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
}

export async function fetchRemoteSavedEvents(): Promise<
  { eventId: string; savedAt: string; event: StudentEvent }[]
> {
  const token = await getRemoteToken();
  if (!token) return [];

  const response = await apiRequest<SavedEventsResponse>('/api/me/saved-events', { token });
  const rawList = Array.isArray(response?.data) ? response.data : [];
  const eventsToCache: StudentEvent[] = [];

  const results = rawList
    .map((item) => {
      const event = item.event ? mapEventDto(item.event) : null;
      if (event) eventsToCache.push(event);
      return {
        eventId: item.eventId,
        savedAt: item.savedAt,
        event: event!,
      };
    })
    .filter((item) => Boolean(item.event));

  if (eventsToCache.length > 0) {
    cacheStudentEvents(eventsToCache, 'remote');
  }

  return results;
}

export async function saveRemoteEvent(eventId: string): Promise<void> {
  const token = await getRemoteToken();
  if (!token) throw new ApiError('UNAUTHORIZED', 'Vui lòng đăng nhập để lưu sự kiện.');

  await apiRequest<{ eventId: string; status: string }>(
    `/api/me/saved-events/${encodeURIComponent(eventId)}`,
    {
      method: 'POST',
      token,
    },
  );
}

export async function unsaveRemoteEvent(eventId: string): Promise<void> {
  const token = await getRemoteToken();
  if (!token) throw new ApiError('UNAUTHORIZED', 'Vui lòng đăng nhập để thao tác.');

  await apiRequest<{ eventId: string; status: string }>(
    `/api/me/saved-events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      token,
    },
  );
}

export async function fetchRemoteRegistrations(): Promise<
  {
    eventId: string;
    status: 'registered' | 'cancelled' | 'checked-in';
    registeredAt: string;
    checkedInAt?: string;
    event: StudentEvent | null;
  }[]
> {
  const token = await getRemoteToken();
  if (!token) return [];

  const response = await apiRequest<RegistrationsResponse>('/api/me/registrations', { token });
  const rawList = Array.isArray(response?.data) ? response.data : [];
  const eventsToCache: StudentEvent[] = [];

  const results = rawList.map((item) => {
    const event = item.event ? mapEventDto(item.event) : null;
    if (event) eventsToCache.push(event);
    return {
      eventId: item.eventId,
      status: item.status,
      registeredAt: item.registeredAt,
      checkedInAt: item.checkedInAt,
      event,
    };
  });

  if (eventsToCache.length > 0) {
    cacheStudentEvents(eventsToCache, 'remote');
  }

  return results;
}

export async function registerRemoteEvent(
  eventId: string,
): Promise<{ eventId: string; status: 'registered' }> {
  const token = await getRemoteToken();
  if (!token) throw new ApiError('UNAUTHORIZED', 'Vui lòng đăng nhập để đăng ký sự kiện.');

  return apiRequest<{ eventId: string; status: 'registered' }>(
    `/api/me/registrations/${encodeURIComponent(eventId)}`,
    {
      method: 'POST',
      token,
    },
  );
}

export async function cancelRemoteRegistration(
  eventId: string,
): Promise<{ eventId: string; status: 'cancelled' }> {
  const token = await getRemoteToken();
  if (!token) throw new ApiError('UNAUTHORIZED', 'Vui lòng đăng nhập để hủy đăng ký.');

  return apiRequest<{ eventId: string; status: 'cancelled' }>(
    `/api/me/registrations/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      token,
    },
  );
}

export async function checkInRemoteEvent(
  eventId: string,
  qrValue: string,
): Promise<{ eventId: string; status: 'checked-in' }> {
  const token = await getRemoteToken();
  if (!token) throw new ApiError('UNAUTHORIZED', 'Vui lòng đăng nhập để điểm danh.');

  return apiRequest<{ eventId: string; status: 'checked-in' }>(
    `/api/me/registrations/${encodeURIComponent(eventId)}/check-in`,
    {
      method: 'POST',
      token,
      body: { qrValue },
    },
  );
}
