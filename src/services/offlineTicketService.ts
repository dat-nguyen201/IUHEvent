import { getStoredValue, setStoredValue, removeStoredValue } from '@/services/authStorage';

const OFFLINE_TICKETS_KEY = 'iuh_offline_tickets_v1';

export interface OfflineTicket {
  eventId: string;
  title: string;
  location: string;
  startsAt: string;
  organizer: string;
  category: string;
  studentName: string;
  studentId: string;
  major: string;
  status: 'registered' | 'checked-in';
  qrValue: string;
  registeredAt: string;
  checkedInAt?: string;
  drlPoints: number;
  certNumber: string;
}

export async function getOfflineTickets(): Promise<OfflineTicket[]> {
  try {
    const raw = await getStoredValue(OFFLINE_TICKETS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.warn('Failed to read offline tickets:', error);
    return [];
  }
}

export async function getOfflineTicketByEventId(eventId: string): Promise<OfflineTicket | null> {
  const tickets = await getOfflineTickets();
  return tickets.find((t) => t.eventId === eventId) || null;
}

export async function saveOfflineTicket(ticket: OfflineTicket): Promise<void> {
  try {
    const tickets = await getOfflineTickets();
    const index = tickets.findIndex((t) => t.eventId === ticket.eventId);

    if (index >= 0) {
      tickets[index] = { ...tickets[index], ...ticket };
    } else {
      tickets.unshift(ticket);
    }

    await setStoredValue(OFFLINE_TICKETS_KEY, JSON.stringify(tickets));
  } catch (error) {
    console.warn('Failed to save offline ticket:', error);
  }
}

export async function markOfflineTicketCheckedIn(
  eventId: string,
  checkedInAt: string = new Date().toISOString(),
): Promise<void> {
  try {
    const tickets = await getOfflineTickets();
    const index = tickets.findIndex((t) => t.eventId === eventId);
    if (index >= 0) {
      tickets[index].status = 'checked-in';
      tickets[index].checkedInAt = checkedInAt;
      tickets[index].drlPoints = 5;
      await setStoredValue(OFFLINE_TICKETS_KEY, JSON.stringify(tickets));
    }
  } catch (error) {
    console.warn('Failed to mark offline ticket checked in:', error);
  }
}

export async function removeOfflineTicket(eventId: string): Promise<void> {
  try {
    const tickets = await getOfflineTickets();
    const filtered = tickets.filter((t) => t.eventId !== eventId);
    await setStoredValue(OFFLINE_TICKETS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.warn('Failed to remove offline ticket:', error);
  }
}
