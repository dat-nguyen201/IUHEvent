import { appMode } from '@/constants/app-mode';
import { apiRequest } from '@/services/apiClient';
import { getRemoteAccessToken } from '@/services/remoteAuthService';
import { studentEvents } from '@/data/events';

export interface ReviewsAnalytics {
  totalReviews: number;
  averageRating: number;
  satisfactionRate: number; // % 4-5 stars
  needsImprovementCount: number; // events with < 4.0 stars
  distribution: { stars: number; count: number; percentage: number }[];
  topFeedbackTags: { tag: string; count: number }[];
  topRatedEvents: { id: string; title: string; organizer: string; rating: number; count: number }[];
  needsImprovementEvents: { id: string; title: string; organizer: string; rating: number; count: number }[];
  recentReviews: {
    id: string;
    eventId: string;
    eventTitle: string;
    studentName: string;
    studentId: string;
    rating: number;
    comment: string;
    tags: string[];
    createdAt: string;
  }[];
}

export interface AnalyticsSummary {
  kpis: {
    totalEvents: number;
    publishedEvents: number;
    draftEvents: number;
    archivedEvents: number;
    totalCapacity: number;
    totalRegistrations: number;
    totalCheckedIn: number;
    checkInRate: number; // percentage (0-100)
    fillRate: number; // percentage (0-100)
    totalStudents: number;
    activeStudents: number;
  };
  byCategory: {
    category: string;
    eventCount: number;
    registeredCount: number;
    checkedInCount: number;
    percentage: number;
  }[];
  byOrganizer: {
    organizer: string;
    eventCount: number;
    registeredCount: number;
    checkedInCount: number;
  }[];
  recentActivity: {
    id: string;
    title: string;
    organizer: string;
    category: string;
    startsAt: string;
    status: string;
    capacity: number;
    registeredCount: number;
    checkedInCount: number;
  }[];
  reviewsSummary?: ReviewsAnalytics;
}

export async function getAdminAnalytics(): Promise<AnalyticsSummary> {
  if (appMode === 'remote') {
    try {
      const token = await getRemoteAccessToken();
      const response = await apiRequest<{ data: AnalyticsSummary }>('/api/admin/analytics', { token });
      if (response?.data) return response.data;
    } catch (e) {
      console.warn('Could not fetch remote analytics, falling back to local computation:', e);
    }
  }

  // Local demo fallback computation
  let totalCapacity = 0;
  let totalRegistrations = 0;
  let totalCheckedIn = 0;

  const categoryMap: Record<string, { eventCount: number; registeredCount: number; checkedInCount: number }> = {};
  const organizerMap: Record<string, { eventCount: number; registeredCount: number; checkedInCount: number }> = {};

  for (const ev of studentEvents) {
    const cap = ev.capacity || 100;
    const chk = ev.checkedInCount || 0;
    // Estimate registered count as roughly 1.3x checked in or cap * 0.8
    const reg = Math.min(cap, Math.round(chk * 1.35) || 50);

    totalCapacity += cap;
    totalRegistrations += reg;
    totalCheckedIn += chk;

    const cat = ev.category || 'Khác';
    if (!categoryMap[cat]) categoryMap[cat] = { eventCount: 0, registeredCount: 0, checkedInCount: 0 };
    categoryMap[cat].eventCount++;
    categoryMap[cat].registeredCount += reg;
    categoryMap[cat].checkedInCount += chk;

    const org = ev.organizer || 'Chưa xác định';
    if (!organizerMap[org]) organizerMap[org] = { eventCount: 0, registeredCount: 0, checkedInCount: 0 };
    organizerMap[org].eventCount++;
    organizerMap[org].registeredCount += reg;
    organizerMap[org].checkedInCount += chk;
  }

  const totalEvents = studentEvents.length;
  const checkInRate = totalRegistrations > 0 ? Math.round((totalCheckedIn / totalRegistrations) * 100) : 0;
  const fillRate = totalCapacity > 0 ? Math.round((totalRegistrations / totalCapacity) * 100) : 0;

  const byCategory = Object.entries(categoryMap).map(([category, stats]) => ({
    category,
    eventCount: stats.eventCount,
    registeredCount: stats.registeredCount,
    checkedInCount: stats.checkedInCount,
    percentage: totalEvents > 0 ? Math.round((stats.eventCount / totalEvents) * 100) : 0,
  })).sort((a, b) => b.eventCount - a.eventCount);

  const byOrganizer = Object.entries(organizerMap).map(([organizer, stats]) => ({
    organizer,
    eventCount: stats.eventCount,
    registeredCount: stats.registeredCount,
    checkedInCount: stats.checkedInCount,
  })).sort((a, b) => b.eventCount - a.eventCount).slice(0, 8);

  const recentActivity = studentEvents.slice(0, 5).map((ev) => ({
    id: ev.id,
    title: ev.title,
    organizer: ev.organizer,
    category: ev.category,
    startsAt: ev.startsAt,
    status: 'published',
    capacity: ev.capacity,
    registeredCount: Math.min(ev.capacity, Math.round((ev.checkedInCount || 0) * 1.35) || 50),
    checkedInCount: ev.checkedInCount || 0,
  }));

  return {
    kpis: {
      totalEvents,
      publishedEvents: totalEvents,
      draftEvents: 1,
      archivedEvents: 2,
      totalCapacity,
      totalRegistrations,
      totalCheckedIn,
      checkInRate,
      fillRate,
      totalStudents: 1420,
      activeStudents: 1180,
    },
    byCategory,
    byOrganizer,
    recentActivity,
    reviewsSummary: {
      totalReviews: 28,
      averageRating: 4.8,
      satisfactionRate: 93,
      needsImprovementCount: 1,
      distribution: [
        { stars: 5, count: 20, percentage: 71 },
        { stars: 4, count: 6, percentage: 22 },
        { stars: 3, count: 2, percentage: 7 },
        { stars: 2, count: 0, percentage: 0 },
        { stars: 1, count: 0, percentage: 0 },
      ],
      topFeedbackTags: [
        { tag: 'Nội dung bổ ích', count: 18 },
        { tag: 'Diễn giả nhiệt tình', count: 15 },
        { tag: 'Tổ chức chu đáo', count: 12 },
        { tag: 'Hội trường đẹp', count: 9 },
        { tag: 'Âm thanh tốt', count: 7 },
      ],
      topRatedEvents: [
        { id: 'event-1', title: 'Workshop React Native cho người mới', organizer: 'Khoa CNTT', rating: 4.9, count: 14 },
        { id: 'event-9', title: 'Sinh hoạt CLB Tiếng Anh', organizer: 'English Speaking Club', rating: 4.8, count: 10 },
      ],
      needsImprovementEvents: [
        { id: 'event-5', title: 'Đêm nhạc Acoustic tháng 10', organizer: 'CLB Guitar IUH', rating: 4.0, count: 4 },
      ],
      recentReviews: [
        {
          id: 'demo-rev-1',
          eventId: 'event-9',
          eventTitle: 'Sinh hoạt CLB Tiếng Anh',
          studentName: 'Nguyễn Văn An',
          studentId: '21054321',
          rating: 5,
          comment: 'Diễn giả chia sẻ siêu nhiệt tình, các trò chơi nhóm tương tác rất vui và bổ ích!',
          tags: ['Nội dung bổ ích', 'Diễn giả nhiệt tình'],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'demo-rev-2',
          eventId: 'event-5',
          eventTitle: 'Đêm nhạc Acoustic tháng 10',
          studentName: 'Lê Hoàng Nam',
          studentId: '21098765',
          rating: 3,
          comment: 'Âm thanh đoạn đầu hơi rè và chỗ ngồi sân KTX hơi thiếu ghế cho các bạn đến muộn.',
          tags: ['Cần cải thiện âm thanh'],
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
      ],
    },
  };
}
