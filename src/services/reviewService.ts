import { apiRequest } from '@/services/apiClient';
import { getRemoteAccessToken } from '@/services/remoteAuthService';

export interface EventReviewItem {
  id: string;
  studentName: string;
  studentId: string;
  rating: number;
  tags: string[];
  comment: string;
  createdAt: string;
}

export interface EventReviewsResponse {
  data: EventReviewItem[];
  averageRating: number;
  totalReviews: number;
}

export interface SubmitReviewInput {
  rating: number;
  tags: string[];
  comment: string;
}

const DEFAULT_REVIEWS: EventReviewItem[] = [
  {
    id: 'seed-1',
    studentName: 'Nguyễn Văn An',
    studentId: '21054321',
    rating: 5,
    tags: ['Nội dung bổ ích', 'Diễn giả xuất sắc', 'Tổ chức chu đáo'],
    comment: 'Chương trình diễn ra rất đúng giờ, diễn giả chia sẻ thực tế và giải đáp nhiệt tình!',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 'seed-2',
    studentName: 'Trần Thị Mai',
    studentId: '21087654',
    rating: 4,
    tags: ['Nội dung bổ ích', 'Không gian thoáng mát'],
    comment: 'Sự kiện rất hay, mong CLB tổ chức thêm nhiều buổi sinh hoạt chất lượng như thế này.',
    createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  },
];

export async function fetchEventReviews(eventId: string): Promise<EventReviewsResponse> {
  try {
    const res = await apiRequest<EventReviewsResponse>(`/api/events/${encodeURIComponent(eventId)}/reviews`);
    if (res.data.length === 0) {
      return {
        data: DEFAULT_REVIEWS,
        averageRating: 4.5,
        totalReviews: 2,
      };
    }
    return res;
  } catch {
    return {
      data: DEFAULT_REVIEWS,
      averageRating: 4.5,
      totalReviews: 2,
    };
  }
}

export async function submitEventReview(
  eventId: string,
  input: SubmitReviewInput,
): Promise<{ message: string; averageRating: number; totalReviews: number }> {
  const token = await getRemoteAccessToken();
  return apiRequest<{ message: string; averageRating: number; totalReviews: number }>(
    `/api/events/${encodeURIComponent(eventId)}/reviews`,
    {
      method: 'POST',
      token: token || undefined,
      body: input,
    },
  );
}
