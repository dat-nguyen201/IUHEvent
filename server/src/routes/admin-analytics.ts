import { Router } from 'express';
import type { Db } from 'mongodb';

import type { EventDocument, RegistrationDocument, ReviewDocument, UserDocument } from '../types/domain';

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
  reviewsSummary: ReviewsAnalytics;
}

export function createAdminAnalyticsRouter(db: Db) {
  const router = Router();
  const events = db.collection<EventDocument>('events');
  const users = db.collection<UserDocument>('users');
  const reviews = db.collection<ReviewDocument>('reviews');
  const registrations = db.collection<RegistrationDocument>('registrations');

  router.get('/', async (_req, res) => {
    const [allEvents, allReviews, totalStudents, activeStudents, totalRegsDoc, totalCheckInsDoc] = await Promise.all([
      events.find().toArray(),
      reviews.find().sort({ createdAt: -1 }).toArray(),
      users.countDocuments({ role: 'student' }),
      users.countDocuments({ role: 'student', status: 'active' }),
      registrations.countDocuments({ status: { $in: ['registered', 'checked-in'] } }),
      registrations.countDocuments({ status: 'checked-in' }),
    ]);

    let totalCapacity = 0;
    let publishedCount = 0;
    let draftCount = 0;
    let archivedCount = 0;
    let sumEventReg = 0;
    let sumEventChk = 0;

    const categoryMap: Record<string, { eventCount: number; registeredCount: number; checkedInCount: number }> = {};
    const organizerMap: Record<string, { eventCount: number; registeredCount: number; checkedInCount: number }> = {};

    for (const ev of allEvents) {
      if (ev.status === 'published') publishedCount++;
      else if (ev.status === 'draft') draftCount++;
      else if (ev.status === 'archived') archivedCount++;

      const cap = Number(ev.capacity) || 0;
      const reg = Number(ev.registeredCount) || 0;
      const chk = Number(ev.checkedInCount) || 0;

      totalCapacity += cap;
      sumEventReg += reg;
      sumEventChk += chk;

      // Category
      const cat = ev.category || 'Khác';
      if (!categoryMap[cat]) categoryMap[cat] = { eventCount: 0, registeredCount: 0, checkedInCount: 0 };
      categoryMap[cat].eventCount++;
      categoryMap[cat].registeredCount += reg;
      categoryMap[cat].checkedInCount += chk;

      // Organizer
      const org = ev.organizer || 'Chưa xác định';
      if (!organizerMap[org]) organizerMap[org] = { eventCount: 0, registeredCount: 0, checkedInCount: 0 };
      organizerMap[org].eventCount++;
      organizerMap[org].registeredCount += reg;
      organizerMap[org].checkedInCount += chk;
    }

    const totalEvents = allEvents.length;
    const totalRegistrations = Math.max(totalRegsDoc, sumEventReg);
    const totalCheckedIn = Math.max(totalCheckInsDoc, sumEventChk);

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
    })).sort((a, b) => b.eventCount - a.eventCount).slice(0, 10);

    const recentActivity = allEvents
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 5)
      .map((ev) => ({
        id: ev.id,
        title: ev.title,
        organizer: ev.organizer,
        category: ev.category,
        startsAt: ev.startsAt instanceof Date ? ev.startsAt.toISOString() : String(ev.startsAt),
        status: ev.status,
        capacity: ev.capacity,
        registeredCount: ev.registeredCount,
        checkedInCount: ev.checkedInCount,
      }));

    // Build event lookup map
    const eventMap = new Map(allEvents.map((e) => [e.id, e]));

    // Reviews Analytics Computation from real reviews collection
    const totalReviews = allReviews.length;
    const ratingSum = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(1)) : 0;

    const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const tagCounts: Record<string, number> = {};

    // Group reviews by event
    const eventReviewsMap: Record<string, { ratings: number[]; count: number }> = {};

    for (const rev of allReviews) {
      const star = Math.min(5, Math.max(1, Math.round(rev.rating)));
      starCounts[star] = (starCounts[star] || 0) + 1;

      if (Array.isArray(rev.tags)) {
        for (const tag of rev.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }

      if (!eventReviewsMap[rev.eventId]) {
        eventReviewsMap[rev.eventId] = { ratings: [], count: 0 };
      }
      eventReviewsMap[rev.eventId].ratings.push(rev.rating);
      eventReviewsMap[rev.eventId].count++;
    }

    const highStarCount = (starCounts[5] || 0) + (starCounts[4] || 0);
    const satisfactionRate = totalReviews > 0 ? Math.round((highStarCount / totalReviews) * 100) : 0;

    const distribution = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: starCounts[stars] || 0,
      percentage: totalReviews > 0 ? Math.round(((starCounts[stars] || 0) / totalReviews) * 100) : 0,
    }));

    const topFeedbackTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const eventRatingList = Object.entries(eventReviewsMap).map(([eventId, stats]) => {
      const ev = eventMap.get(eventId);
      const avg = Number((stats.ratings.reduce((a, b) => a + b, 0) / stats.count).toFixed(1));
      return {
        id: eventId,
        title: ev?.title || 'Sự kiện IUH',
        organizer: ev?.organizer || 'Trường ĐH Công nghiệp TP.HCM',
        rating: avg,
        count: stats.count,
      };
    });

    const topRatedEvents = [...eventRatingList]
      .sort((a, b) => b.rating - a.rating || b.count - a.count)
      .slice(0, 5);

    const needsImprovementEvents = [...eventRatingList]
      .filter((e) => e.rating < 4.5)
      .sort((a, b) => a.rating - b.rating)
      .slice(0, 5);

    const recentReviews = allReviews.slice(0, 8).map((r) => {
      const ev = eventMap.get(r.eventId);
      return {
        id: r._id?.toHexString() || `${r.userId}-${r.eventId}`,
        eventId: r.eventId,
        eventTitle: ev?.title || 'Sự kiện IUH',
        studentName: r.userName || 'Sinh viên IUH',
        studentId: r.userStudentId || '21000001',
        rating: r.rating,
        comment: r.comment,
        tags: r.tags || [],
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      };
    });

    const reviewsSummary: ReviewsAnalytics = {
      totalReviews,
      averageRating,
      satisfactionRate,
      needsImprovementCount: needsImprovementEvents.length,
      distribution,
      topFeedbackTags,
      topRatedEvents,
      needsImprovementEvents,
      recentReviews,
    };

    const response: AnalyticsSummary = {
      kpis: {
        totalEvents,
        publishedEvents: publishedCount,
        draftEvents: draftCount,
        archivedEvents: archivedCount,
        totalCapacity,
        totalRegistrations,
        totalCheckedIn,
        checkInRate,
        fillRate,
        totalStudents,
        activeStudents,
      },
      byCategory,
      byOrganizer,
      recentActivity,
      reviewsSummary,
    };

    res.json({ data: response });
  });

  return router;
}
