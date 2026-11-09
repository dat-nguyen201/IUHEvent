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

export type ParticipantFilter = 'all' | 'under50' | '50to100' | 'over100' | 'zero';
export type RatingFilter = 'all' | '4.5plus' | '4.0plus' | '3.0plus' | 'unrated';
export type TimeFilter = 'all' | 'upcoming' | 'past' | 'this_week' | 'this_month';
export type AdminEventSort = 'date_desc' | 'date_asc' | 'participants_desc' | 'participants_asc' | 'rating_desc';

export type AdminEventFilter = {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: AdminEventStatus;
  participantRange?: ParticipantFilter;
  ratingRange?: RatingFilter;
  timeRange?: TimeFilter;
  sortBy?: AdminEventSort;
};
