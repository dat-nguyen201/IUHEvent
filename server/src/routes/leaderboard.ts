import { Router } from 'express';
import type { Db } from 'mongodb';

import { verifyAccessToken } from '../lib/security';
import type { RegistrationDocument, UserDocument } from '../types/domain';

export interface LeaderboardStudent {
  rank: number;
  userId: string;
  name: string;
  studentId: string;
  major: string;
  drlPoints: number;
  checkedInCount: number;
  avatarUrl?: string;
  badge: string;
}

export interface CurrentUserRankInfo {
  rank: number;
  totalStudents: number;
  drlPoints: number;
  checkedInCount: number;
  badge: string;
}

export interface FacultyRanking {
  rank: number;
  faculty: string;
  totalParticipants: number;
  totalEventsJoined: number;
  averageDrl: number;
}

export function createLeaderboardRouter(db: Db) {
  const router = Router();
  const users = db.collection<UserDocument>('users');
  const registrations = db.collection<RegistrationDocument>('registrations');

  router.get('/', async (req, res) => {
    try {
      // Check optional auth token to identify current user
      let currentUserId: string | null = null;
      const authorization = req.get('authorization');
      const match = authorization?.match(/^Bearer\s+(.+)$/i);
      if (match) {
        try {
          const claims = verifyAccessToken(match[1]);
          currentUserId = claims.userId;
        } catch {
          // Ignore invalid/expired token for leaderboard read
        }
      }

      // 1. Fetch all active users (including students & testing accounts)
      const allActiveUsers = await users.find({ status: 'active' }).toArray();

      // 2. Fetch all checked-in registrations
      const checkIns = await registrations.find({ status: 'checked-in' }).toArray();

      // Count check-ins by user
      const checkInCountMap = new Map<string, number>();
      for (const reg of checkIns) {
        const uid = String(reg.userId);
        checkInCountMap.set(uid, (checkInCountMap.get(uid) || 0) + 1);
      }

      // Map users with DRL points (base 65 + 5 points per event)
      const studentsList: LeaderboardStudent[] = allActiveUsers.map((u) => {
        const uid = u._id.toHexString();
        const checkedInCount = checkInCountMap.get(uid) || 0;
        const drlPoints = Math.min(100, 65 + checkedInCount * 5);

        let badge = '🥉 Tích cực';
        if (drlPoints >= 90) badge = '🏆 Xuất sắc';
        else if (drlPoints >= 80) badge = '🥇 Tiêu biểu';
        else if (drlPoints >= 70) badge = '🥈 Năng động';

        return {
          rank: 1,
          userId: uid,
          name: u.name,
          studentId: u.studentId || (u.role === 'admin' ? 'ADMIN' : 'BTC'),
          major: u.major || (u.role === 'admin' ? 'Ban Quản trị IUH' : 'Khoa Công nghệ Thông tin'),
          drlPoints,
          checkedInCount,
          badge,
        };
      });

      // Deterministic sort: drlPoints desc, checkedInCount desc, userId asc
      studentsList.sort(
        (a, b) => b.drlPoints - a.drlPoints || b.checkedInCount - a.checkedInCount || a.userId.localeCompare(b.userId),
      );

      // Assign exact ranks
      studentsList.forEach((s, idx) => {
        s.rank = idx + 1;
      });

      // Top 30 for leaderboard podium and list
      const topStudents = studentsList.slice(0, 30);

      // Exact current user ranking info
      let currentUser: CurrentUserRankInfo | null = null;
      if (currentUserId) {
        const found = studentsList.find((s) => s.userId === currentUserId);
        if (found) {
          currentUser = {
            rank: found.rank,
            totalStudents: studentsList.length,
            drlPoints: found.drlPoints,
            checkedInCount: found.checkedInCount,
            badge: found.badge,
          };
        }
      }

      // Faculty statistics
      const facultyMap: Record<string, { participants: Set<string>; checkIns: number; totalDrl: number }> = {};
      for (const s of studentsList) {
        const fac = s.major || 'Khoa Công nghệ Thông tin';
        if (!facultyMap[fac]) {
          facultyMap[fac] = { participants: new Set(), checkIns: 0, totalDrl: 0 };
        }
        facultyMap[fac].participants.add(s.userId);
        facultyMap[fac].checkIns += s.checkedInCount;
        facultyMap[fac].totalDrl += s.drlPoints;
      }

      const facultyRankings: FacultyRanking[] = Object.entries(facultyMap)
        .map(([faculty, stats]) => {
          const count = stats.participants.size;
          return {
            rank: 1,
            faculty,
            totalParticipants: count,
            totalEventsJoined: stats.checkIns,
            averageDrl: count > 0 ? Number((stats.totalDrl / count).toFixed(1)) : 70,
          };
        })
        .sort((a, b) => b.totalEventsJoined - a.totalEventsJoined || b.averageDrl - a.averageDrl)
        .map((f, idx) => ({ ...f, rank: idx + 1 }));

      res.json({
        data: {
          topStudents,
          facultyRankings,
          currentUser,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to compute leaderboard:', error);
      res.status(500).json({ code: 'SERVER_ERROR', message: 'Lỗi khi tính toán bảng xếp hạng.' });
    }
  });

  return router;
}
