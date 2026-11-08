import { appMode } from '@/constants/app-mode';
import { apiRequest } from '@/services/apiClient';
import { getRemoteAccessToken } from '@/services/remoteAuthService';
import { mapEventDto } from '@/services/eventsApi';
import type { EventDto } from '@/types/api';
import type { StudentEvent } from '@/types/events';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  events?: StudentEvent[];
};

type ChatResponse = {
  data: {
    role: 'assistant';
    content: string;
    source: 'ai' | 'fallback';
    events?: EventDto[];
  };
};

function demoReply(message: string): ChatMessage {
  const normalized = message.toLocaleLowerCase('vi-VN');
  if (normalized.includes('đăng ký') || normalized.includes('tham gia')) {
    return {
      role: 'assistant',
      content: 'Bạn mở mục Khám phá, chọn sự kiện phù hợp rồi nhấn Đăng ký tham gia. Lịch đã đăng ký sẽ xuất hiện trong mục Lịch của tôi.',
    };
  }
  if (normalized.includes('check-in') || normalized.includes('qr')) {
    return {
      role: 'assistant',
      content: 'Để check-in, mở sự kiện đã đăng ký và chọn Check-in QR. Hãy cấp quyền camera khi ứng dụng yêu cầu.',
    };
  }
  return {
    role: 'assistant',
    content: 'Mình có thể giúp bạn tìm sự kiện, hướng dẫn đăng ký, xem lịch hoặc check-in QR. Hãy thử hỏi cụ thể hơn nhé!',
  };
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<ChatMessage> {
  if (appMode !== 'remote') return demoReply(messages[messages.length - 1].content);

  const token = await getRemoteAccessToken();
  const response = await apiRequest<ChatResponse>('/api/chat', {
    method: 'POST',
    token,
    body: {
      messages: messages.slice(-12).map(({ role, content }) => ({ role, content })),
    },
  });
  return {
    role: response.data.role,
    content: response.data.content,
    events: response.data.events?.map(mapEventDto),
  };
}
