import { studentEvents } from '@/data/events';
import { getStoredValue, setStoredValue } from '@/services/authStorage';
import type { EventCategory, EventPage, StudentEvent } from '@/types/events';

type GetEventsParams = {
  page: number;
  pageSize: number;
  query?: string;
  category?: EventCategory;
  fail?: boolean;
};

const NETWORK_DELAY_MS = 350;
const REGISTERED_EVENTS_KEY = 'iuh-event-registered-events';
const registeredEventIds = new Set<string>();
let registrationLoad: Promise<void> | null = null;

async function loadRegisteredEvents() {
  if (!registrationLoad) {
    registrationLoad = (async () => {
      const storedValue = await getStoredValue(REGISTERED_EVENTS_KEY);
      if (!storedValue) return;

      try {
        const eventIds: unknown = JSON.parse(storedValue);
        if (!Array.isArray(eventIds)) return;
        const validEventIds = eventIds.filter(
          (eventId): eventId is string => typeof eventId === 'string' && Boolean(getEventByIdSync(eventId)),
        );
        validEventIds.forEach((eventId) => registeredEventIds.add(eventId));
      } catch {
        await setStoredValue(REGISTERED_EVENTS_KEY, JSON.stringify([]));
      }
    })().catch((error: unknown) => {
      registrationLoad = null;
      throw error;
    });
  }

  await registrationLoad;
}

async function persistRegisteredEvents(nextEventIds: Set<string>) {
  await setStoredValue(REGISTERED_EVENTS_KEY, JSON.stringify([...nextEventIds]));
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function getEvents({
  page,
  pageSize,
  query = '',
  category,
  fail = false,
}: GetEventsParams): Promise<EventPage> {
  await wait(NETWORK_DELAY_MS);

  if (fail) {
    throw new Error('Demo network error');
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredEvents = studentEvents.filter((event) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      event.title.toLowerCase().includes(normalizedQuery) ||
      event.location.toLowerCase().includes(normalizedQuery);
    const matchesCategory = !category || event.category === category;

    return matchesQuery && matchesCategory;
  });

  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: filteredEvents.slice(start, end),
    page,
    hasMore: end < filteredEvents.length,
  };
}

export async function getEventById(id: string): Promise<StudentEvent | undefined> {
  await wait(NETWORK_DELAY_MS);
  return getEventByIdSync(id);
}

export function getEventByIdSync(id: string): StudentEvent | undefined {
  return studentEvents.find((event) => event.id === id);
}

export async function registerEvent(id: string) {
  await wait(NETWORK_DELAY_MS);
  if (!getEventByIdSync(id)) {
    throw new Error('EVENT_NOT_FOUND');
  }
  await loadRegisteredEvents();
  const nextEventIds = new Set(registeredEventIds);
  nextEventIds.add(id);
  await persistRegisteredEvents(nextEventIds);
  registeredEventIds.add(id);
  return { eventId: id, status: 'registered' as const };
}

export async function cancelEventRegistration(id: string) {
  await wait(NETWORK_DELAY_MS);
  if (!getEventByIdSync(id)) {
    throw new Error('EVENT_NOT_FOUND');
  }
  await loadRegisteredEvents();
  const nextEventIds = new Set(registeredEventIds);
  nextEventIds.delete(id);
  await persistRegisteredEvents(nextEventIds);
  registeredEventIds.delete(id);
  return { eventId: id, status: 'cancelled' as const };
}

export async function isEventRegistered(id: string) {
  await loadRegisteredEvents();
  return registeredEventIds.has(id);
}

export async function checkInEvent(id: string, qrValue: string) {
  await wait(NETWORK_DELAY_MS);
  return {
    eventId: id,
    success: qrValue === id || qrValue === `student-event:${id}`,
  };
}
