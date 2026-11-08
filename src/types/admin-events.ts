import type { EventCategory } from '@/types/events';

export type AdminEventStatus = 'draft' | 'published' | 'archived';

export type AdminEvent = {
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
  imageKey?: string;
  imageUrl?: string;
  status: AdminEventStatus;
  avgRating?: number | null;
  reviewCount?: number;
};

export type AdminEventInput = {
  title: string;
  description: string;
  startsAt: string;
  location: string;
  category: EventCategory;
  organizer: string;
  capacity: number;
  summarySource: string;
  imageKey?: string;
  imageUrl?: string;
};

export type AdminEventPage = {
  data: AdminEvent[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

export type AdminEventFilter = {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: AdminEventStatus;
};
