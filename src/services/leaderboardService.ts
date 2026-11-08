import { appMode } from '@/constants/app-mode';
import { apiRequest } from '@/services/apiClient';

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

export interface FacultyRanking {
  rank: number;
  faculty: string;
  totalParticipants: number;
  totalEventsJoined: number;
  averageDrl: number;
}

export interface LeaderboardData {
  topStudents: LeaderboardStudent[];
  facultyRankings: FacultyRanking[];
  updatedAt: string;
}

const FALLBACK_LEADERBOARD: LeaderboardData = {
  topStudents: [
    { rank: 1, userId: '1', name: 'Nguyễn Minh Giang', studentId: '21051234', major: 'Khoa học Máy tính', drlPoints: 100, checkedInCount: 8, badge: '🏆 Xuất sắc' },
    { rank: 2, userId: '2', name: 'Lê Quốc Kiệt', studentId: '21054321', major: 'Marketing', drlPoints: 100, checkedInCount: 7, badge: '🏆 Xuất sắc' },
    { rank: 3, userId: '3', name: 'Phan Thanh Mai', studentId: '21098765', major: 'Công nghệ Thông tin', drlPoints: 100, checkedInCount: 7, badge: '🏆 Xuất sắc' },
    { rank: 4, userId: '4', name: 'Võ Anh Nhiên', studentId: '21011223', major: 'Ngôn ngữ Anh', drlPoints: 95, checkedInCount: 6, badge: '🏆 Xuất sắc' },
    { rank: 5, userId: '5', name: 'Tạ Mỹ Toàn', studentId: '21033445', major: 'Kế toán', drlPoints: 95, checkedInCount: 6, badge: '🏆 Xuất sắc' },
  ],
  facultyRankings: [
    { rank: 1, faculty: 'Công nghệ Thông tin', totalParticipants: 124, totalEventsJoined: 420, averageDrl: 88.5 },
    { rank: 2, faculty: 'Quản trị Kinh doanh', totalParticipants: 98, totalEventsJoined: 310, averageDrl: 86.2 },
    { rank: 3, faculty: 'Ngoại ngữ', totalParticipants: 85, totalEventsJoined: 285, averageDrl: 85.0 },
    { rank: 4, faculty: 'Cơ khí - Động lực', totalParticipants: 72, totalEventsJoined: 230, averageDrl: 82.4 },
  ],
  updatedAt: new Date().toISOString(),
};

export async function fetchLeaderboard(): Promise<LeaderboardData> {
  if (appMode === 'remote') {
    try {
      const response = await apiRequest<{ data: LeaderboardData }>('/api/leaderboard');
      if (response?.data) return response.data;
    } catch (error) {
      console.warn('Could not fetch remote leaderboard, using fallback:', error);
    }
  }

  return FALLBACK_LEADERBOARD;
}
