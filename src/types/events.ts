import type { ImageSourcePropType } from 'react-native';

export type EventCategory = 'Học thuật' | 'CLB' | 'Tình nguyện' | 'Giải trí';

export type StudentEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  category: EventCategory;
  organizer: string;
  image: ImageSourcePropType;
  capacity: number;
  checkedInCount: number;
  summarySource: string;
};

export type EventPage = {
  items: StudentEvent[];
  page: number;
  hasMore: boolean;
  total?: number;
  /** 'remote' = lấy từ API, 'fallback' = dữ liệu demo khi API lỗi. */
  source?: 'remote' | 'fallback';
};
