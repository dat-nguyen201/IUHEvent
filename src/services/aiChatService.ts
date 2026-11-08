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
  if (
    normalized.includes('cần người hỗ trợ')
    || normalized.includes('cần một người hỗ trợ')
    || normalized.includes('cần hỗ trợ')
    || normalized.includes('gặp người hỗ trợ')
    || normalized.includes('liên hệ hỗ trợ')
  ) {
    return {
      role: 'assistant',
      content: 'Bạn hãy liên hệ trực tiếp Phòng Tổ chức sự kiện tại trường IUH để được hỗ trợ.',
    };
  }
  if (/\b(hướng dẫn|cách)\s+(đăng\s+k[ýi]|sự kiện)\b|\bđăng\s+k[ýi]\s+sự kiện\b/i.test(normalized)) {
    return {
      role: 'assistant',
      content: 'Để đăng ký sự kiện:\n1. Chọn sự kiện ở mục Khám phá.\n2. Chọn “Đăng ký tham gia ngay”.\n3. Khi có thông báo, nghĩa là bạn đã đăng ký thành công.',
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
