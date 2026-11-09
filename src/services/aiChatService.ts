import { appMode } from '@/constants/app-mode';
import { apiRequest } from '@/services/apiClient';
import { getRemoteAccessToken } from '@/services/remoteAuthService';
import { mapEventDto } from '@/services/eventsApi';
import { resolveCampusLocation } from '@/utils/campusLocation';
import type { EventDto } from '@/types/api';
import type { StudentEvent } from '@/types/events';

export type CampusMapAction = {
  campusId: 'main' | 'cs2' | 'quang_ngai' | 'thanh_hoa';
  campusName: string;
  address: string;
  buildingCode?: string | null;
  room?: string | null;
  floorHint?: string | null;
  googleMapsUrl: string;
  hasInternalMap: boolean;
};

export type ResolvedCampusData = {
  campusId: 'main' | 'cs2' | 'quang_ngai' | 'thanh_hoa';
  campusName: string;
  shortName: string;
  address: string;
  buildingCode?: string | null;
  room?: string | null;
  floorHint?: string | null;
  googleMapsUrl: string;
  googleDirectionsUrl: string;
  hasInternalMap: boolean;
  aiAnalysis: string;
  transportHint?: string;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  events?: StudentEvent[];
  mapAction?: CampusMapAction;
  navigateTo?: string;
};

type ChatResponse = {
  data: {
    role: 'assistant';
    content: string;
    source: 'ai' | 'fallback';
    events?: EventDto[];
    mapAction?: CampusMapAction;
    navigateTo?: string;
  };
};

function demoReply(message: string): ChatMessage {
  const normalized = message.toLocaleLowerCase('vi-VN');

  // Leaderboard
  if (/\b(bxh|bang xep hang|xep hang|thu hang|vi tri.*thu may|thu may|hang may|diem ren luyen|drl)\b/i.test(normalized)) {
    return {
      role: 'assistant',
      content: '🏆 Bạn đang đứng vị trí #3 trên Bảng xếp hạng DRL toàn trường với 75/100 điểm rèn luyện (Huy hiệu 🥈 Năng động), đã check-in thành công 2 sự kiện!\n👉 Bạn có thể mở Bảng xếp hạng để xem chi tiết.',
      navigateTo: '/leaderboard',
    };
  }

  // Campus map & locations
  if (normalized.includes('quang ngai')) {
    return {
      role: 'assistant',
      content: '📍 Đây là phân hiệu ngoài TP.HCM của trường:\n🏢 ĐH Công nghiệp TP.HCM - Phân hiệu Quảng Ngãi\n📌 Địa chỉ: 938 Quang Trung, TP. Quảng Ngãi, Tỉnh Quảng Ngãi\n👉 Bạn hãy bấm nút bên dưới để mở Google Maps chỉ đường nhé!',
      mapAction: {
        campusId: 'quang_ngai',
        campusName: 'Phân hiệu Quảng Ngãi',
        address: '938 Quang Trung, TP. Quảng Ngãi, Tỉnh Quảng Ngãi',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=15.111874,108.795844',
        hasInternalMap: false,
      },
    };
  }

  if (normalized.includes('thanh hoa') || normalized.includes('quang tam')) {
    return {
      role: 'assistant',
      content: '📍 Đây là cơ sở đào tạo khu vực phía Bắc của trường:\n🏢 ĐH Công nghiệp TP.HCM - Cơ sở Thanh Hóa\n📌 Địa chỉ: Xã Quảng Tâm, TP. Thanh Hóa, Tỉnh Thanh Hóa\n👉 Bạn hãy bấm nút bên dưới để mở Google Maps chỉ đường nhé!',
      mapAction: {
        campusId: 'thanh_hoa',
        campusName: 'Cơ sở Thanh Hóa',
        address: 'Xã Quảng Tâm, TP. Thanh Hóa, Tỉnh Thanh Hóa',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=19.761502,105.828699',
        hasInternalMap: false,
      },
    };
  }

  if (normalized.includes('co so 2') || normalized.includes('cs2') || normalized.includes('nguyen van dung') || normalized.includes('pham van chieu')) {
    return {
      role: 'assistant',
      content: '📍 Địa điểm này thuộc Cơ sở 2 của IUH:\n🏢 ĐH Công nghiệp TP.HCM - Cơ sở 2 (Gò Vấp)\n📌 Địa chỉ: 20 Nguyễn Văn Dung, Phường 6, Quận Gò Vấp, TP.HCM\n- Nơi tổ chức học thể chất, sân bóng và ký túc xá sinh viên.\n👉 Bạn hãy bấm nút bên dưới để mở Google Maps chỉ đường nhé!',
      mapAction: {
        campusId: 'cs2',
        campusName: 'Cơ sở 2 (Nguyễn Văn Dung, Gò Vấp)',
        address: '20 Nguyễn Văn Dung, Phường 6, Quận Gò Vấp, TP.HCM',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=10.844754,106.684128',
        hasInternalMap: false,
      },
    };
  }

  if (/\b(ban do|so do|hoi truong a7|hoi truong e4|nha a|nha b|nha c|nha e|nha h|nha v|nha x)\b/i.test(normalized)) {
    const building = normalized.includes('nhà a') || normalized.includes('a7') ? 'A' : normalized.includes('nhà e') || normalized.includes('e4') ? 'E' : normalized.includes('nhà v') ? 'V' : 'A';
    return {
      role: 'assistant',
      content: `📍 Vị trí: Nhà ${building} - Trụ sở chính IUH\n📌 Địa chỉ: 12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP.HCM\n👉 Bạn hãy bấm nút "Xem sơ đồ khuôn viên" để xem vị trí đánh dấu trực quan hoặc bấm "Chỉ đường Google Maps"!`,
      mapAction: {
        campusId: 'main',
        campusName: 'Trụ sở chính IUH (Cơ sở 1 - Gò Vấp)',
        address: '12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP.HCM',
        buildingCode: building,
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=10.822159,106.687483',
        hasInternalMap: true,
      },
    };
  }

  if (/\b(đổi mật khẩu|quên mật khẩu|mật khẩu)\b/i.test(normalized)) {
    return {
      role: 'assistant',
      content: '🔐 Để đổi mật khẩu, bạn vào tab "Hồ sơ" > chọn mục "Đổi mật khẩu" và nhập mật khẩu mới. Nếu quên mật khẩu cũ, bạn có thể đăng xuất và bấm "Quên mật khẩu?" tại màn hình Đăng nhập để nhận mã OTP qua email.',
    };
  }
  if (/\b(đã check[\s-]?in|đã tham gia|lịch sử)\b/i.test(normalized)) {
    return {
      role: 'assistant',
      content: '✅ Bạn đã check-in thành công 2 sự kiện: Workshop Lập trình React Native và Ngày hội Việc làm IUH Career Fair. Bạn có thể mở chi tiết sự kiện để tải Giấy chứng nhận điện tử (E-Certificate)!',
    };
  }
  if (/\b(chưa check[\s-]?in|đã đăng ký|vé của tôi|lịch của tôi)\b/i.test(normalized)) {
    return {
      role: 'assistant',
      content: '📱 Bạn đang có 1 sự kiện đã đăng ký chờ tham gia: Hội thảo Trí tuệ Nhân tạo trong Kỷ nguyên số (Phòng E4.01). Bạn có thể mở Vé sự kiện ngoại tuyến để xuất trình mã QR khi đến nơi!',
    };
  }
  if (/\b(gợi ý|phù hợp với tôi|dành cho tôi)\b/i.test(normalized)) {
    return {
      role: 'assistant',
      content: '💡 Dựa vào chuyên ngành và sở thích của bạn, mình gợi ý bạn nên tham gia "Cuộc thi Sáng tạo Công nghệ IUH Hackathon" và "Talkshow Khởi nghiệp Công nghệ"! Mời bạn mở mục Khám phá để đăng ký.',
    };
  }
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
    content: 'Mình có thể giúp bạn kiểm tra thứ hạng BXH, xem sự kiện đã/chưa check-in, chỉ đường tới các cơ sở/phòng học hoặc gợi ý sự kiện phù hợp. Hãy thử hỏi cụ thể hơn nhé!',
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
    mapAction: response.data.mapAction,
    navigateTo: response.data.navigateTo,
  };
}

export async function resolveEventCampusLocationAI(
  location: string,
  extraContext?: { title?: string; description?: string }
): Promise<ResolvedCampusData> {
  const fallback = resolveCampusLocation(
    location,
    `${extraContext?.title || ''} ${extraContext?.description || ''}`
  );

  const defaultData: ResolvedCampusData = {
    campusId: fallback.campus.id,
    campusName: fallback.campus.name,
    shortName: fallback.campus.shortName,
    address: fallback.campus.address,
    buildingCode: fallback.code,
    room: fallback.room,
    floorHint: fallback.floorHint,
    googleMapsUrl: fallback.campus.mapsUrl,
    googleDirectionsUrl: fallback.campus.directionsUrl,
    hasInternalMap: fallback.campus.hasInternalMap,
    aiAnalysis: fallback.aiExplanation || `AI định vị sự kiện tại ${fallback.campus.shortName}.`,
    transportHint: fallback.campus.transportHint,
  };

  if (appMode !== 'remote') return defaultData;

  try {
    const token = await getRemoteAccessToken();
    const res = await apiRequest<{ data: ResolvedCampusData }>('/api/chat/resolve-campus', {
      method: 'POST',
      token,
      body: {
        location,
        title: extraContext?.title,
        description: extraContext?.description,
      },
    });
    if (res?.data) {
      return res.data;
    }
  } catch (err) {
    console.warn('[aiChatService] resolve-campus request failed, using local smart resolver.', err);
  }

  return defaultData;
}
