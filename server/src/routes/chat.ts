import { Router } from 'express';
import { type Db } from 'mongodb';

import { badRequest } from '../lib/errors';
import { chatSchema } from '../lib/validation';
import { requireAuth } from '../middleware/auth';
import type { EventDocument } from '../types/domain';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type ChatEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  category: EventDocument['category'];
  organizer: string;
  capacity: number;
  registeredCount: number;
  remainingSpots: number;
  checkedInCount: number;
  summarySource: string;
  imageKey?: string;
  imageUrl?: string;
};

const OFF_TOPIC_PATTERNS = [
  /\b(lập trình|code|javascript|python|html|css|sql|toán|vật lý|hóa học)\b/i,
  /\b(thời tiết|chứng khoán|bóng đá|tin tức|phim|nhạc|du lịch|nấu ăn)\b/i,
  /\b(vé máy bay|đặt phòng|ship hàng)\b/i,
  /\b(meme|truyện|bài tập|game|hack|mật khẩu)\b/i,
];
const EVENT_TERMS = [
  'sự kiện', 'chương trình', 'hoạt động', 'hội thảo', 'workshop', 'talkshow',
  'đăng ký', 'vé', 'check-in', 'check in', 'qr', 'địa điểm', 'thời gian',
  'bắt đầu', 'tham gia', 'ban tổ chức', 'phòng tổ chức', 'còn chỗ', 'số người',
  'học thuật', 'clb', 'tình nguyện', 'giải trí', 'tòa nhà', 'toà nhà',
  'tòa', 'toà', 'phòng', 'khu', 'cơ sở', 'ở đâu', 'tại đâu',
];

function isEventRelated(message: string) {
  const normalized = message.toLocaleLowerCase('vi-VN');
  if (OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  return EVENT_TERMS.some((term) => normalized.includes(term));
}

function isIncidentQuestion(message: string) {
  return /\b(không tìm thấy|thất lạc|sai thông tin|lỗi|sự cố|không nhận được|không vào được|vé)\b/i.test(message);
}

function isSupportQuestion(message: string) {
  const normalized = message.toLocaleLowerCase('vi-VN');
  return normalized.includes('cần người hỗ trợ')
    || normalized.includes('cần một người hỗ trợ')
    || normalized.includes('cần hỗ trợ')
    || normalized.includes('gặp người hỗ trợ')
    || normalized.includes('liên hệ hỗ trợ');
}

function isEventSearchQuestion(message: string) {
  return /\b(tìm|gợi ý|danh sách|có .* nào|sự kiện nào|chương trình nào|hoạt động nào|workshop nào|ở đâu|tại đâu|tòa nhà|toà nhà|phòng nào|khu nào|cơ sở nào)\b/i.test(message);
}

function isUpcomingEventsQuestion(message: string) {
  return /\bsắp diễn ra\b/i.test(message)
    && /\b(sự kiện|chương trình|hoạt động)\b/i.test(message);
}

function isTomorrowQuestion(message: string) {
  return /\b(ngày\s+mai|mai)\b/i.test(message) && /\b(sự kiện|chương trình|hoạt động|diễn ra)\b/i.test(message);
}

function isThisMonthQuestion(message: string) {
  return /\b(tháng\s+này|trong\s+tháng\s+này)\b/i.test(message) && /\b(sự kiện|chương trình|hoạt động|diễn ra)\b/i.test(message);
}

function isDateSearchQuestion(message: string) {
  return isTomorrowQuestion(message) || isThisMonthQuestion(message);
}

function isRegistrationQuestion(message: string) {
  return /\b(hướng dẫn|cách)\s+(đăng\s+k[ýi]|sự kiện)\b|\bđăng\s+k[ýi]\s+sự kiện\b/i.test(message);
}

function isCheckInQuestion(message: string) {
  return /\b(cách check[\s-]?in bằng qr|check[\s-]?in bằng qr|check[\s-]?in qr)\b/i.test(message);
}

function hasLocationConstraint(message: string) {
  return /\b(tòa|toà|phòng|khu|cơ sở)\s+(?!nào\b|đâu\b)[a-z0-9][a-z0-9 .-]*/i.test(message);
}

function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function containsLocationTerm(location: string, term: string) {
  const locationTokens = normalizeSearchText(location).match(/[a-z0-9]+/g) ?? [];
  const termTokens = normalizeSearchText(term).match(/[a-z0-9]+/g) ?? [];
  if (termTokens.length === 0) return false;
  return locationTokens.some((_, index) =>
    termTokens.every((token, offset) => locationTokens[index + offset] === token),
  );
}

function findNamedEvent(message: string, events: EventDocument[]) {
  const normalizedMessage = normalizeSearchText(message);
  return events.find((event) => {
    const title = normalizeSearchText(event.title);
    if (normalizedMessage.includes(title)) return true;
    const titleWords = title.split(/\s+/).filter((word) => word.length > 3);
    return titleWords.length >= 2
      && titleWords.filter((word) => normalizedMessage.includes(word)).length >= Math.ceil(titleWords.length * 0.7);
  });
}

function trim(value: string, length: number) {
  return value.trim().slice(0, length);
}

function findMatchingEvents(message: string, events: EventDocument[]) {
  const now = new Date();
  if (isTomorrowQuestion(message)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return events.filter((event) => event.startsAt.toDateString() === tomorrow.toDateString()).slice(0, 5);
  }
  if (isThisMonthQuestion(message)) {
    return events.filter((event) =>
      event.startsAt.getFullYear() === now.getFullYear()
      && event.startsAt.getMonth() === now.getMonth()
      && event.startsAt.getTime() > now.getTime(),
    ).slice(0, 5);
  }
  const query = message.toLocaleLowerCase('vi-VN');
  const locationMatch = query.match(/\b(?:tòa|toà|phòng|khu|cơ sở)\s+([a-z0-9][a-z0-9.-]*)/i);
  const words = (locationMatch ? [locationMatch[1]] : query.split(/\s+/)).filter((word) =>
    (locationMatch || word.length > 1) && ![
      'sự', 'kiện', 'nào', 'này', 'có', 'không', 'ở', 'tại', 'tòa', 'toà',
      'nhà', 'phòng', 'khu', 'cơ', 'sở', 'đang', 'diễn', 'ra', 'sắp',
    ].includes(word),
  );
  if (words.length === 0 && !hasLocationConstraint(message)) return events.slice(0, 5);
  const matches = events.filter((event) => {
    if (locationMatch) return containsLocationTerm(event.location, locationMatch[1]);
    const searchable = normalizeSearchText(`${event.title} ${event.category} ${event.organizer} ${event.location}`);
    return words.length === 0 || words.some((word) => searchable.includes(normalizeSearchText(word)));
  });
  return matches.slice(0, 5);
}

function toChatEvent(event: EventDocument): ChatEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    location: event.location,
    category: event.category,
    organizer: event.organizer,
    capacity: event.capacity,
    registeredCount: event.registeredCount,
    remainingSpots: Math.max(0, event.capacity - event.registeredCount),
    checkedInCount: event.checkedInCount,
    summarySource: event.summarySource,
    imageKey: event.imageKey,
    imageUrl: event.imageUrl,
  };
}

function buildFallbackReply(message: string, events: EventDocument[]) {
  if (isSupportQuestion(message)) {
    return 'Bạn hãy liên hệ trực tiếp Phòng Tổ chức sự kiện tại trường IUH để được hỗ trợ.';
  }
  if (!isEventRelated(message)) {
    return 'Mình là trợ lý của IUH Event nên chỉ hỗ trợ thông tin về sự kiện, lịch chương trình, đăng ký và check-in. Bạn có thể hỏi mình về một sự kiện cụ thể nhé.';
  }
  if (isIncidentQuestion(message)) {
    return 'Mình rất tiếc vì bạn đang gặp sự cố. Bạn vui lòng kiểm tra lại email/vé và thông tin đăng ký. Nếu vẫn chưa được giải quyết, hãy liên hệ trực tiếp Phòng tổ chức sự kiện IUH để được hỗ trợ nhanh nhất.';
  }
  if (isRegistrationQuestion(message)) {
    return 'Để đăng ký sự kiện:\n1. Chọn sự kiện ở mục Khám phá.\n2. Chọn “Đăng ký tham gia ngay”.\n3. Khi có thông báo, nghĩa là bạn đã đăng ký thành công.';
  }
  if (isCheckInQuestion(message)) {
    return 'Để check-in sự kiện:\n1. Mở sự kiện bạn đã đăng ký.\n2. Nhấn “Check-in QR”.\n3. Cấp quyền camera nếu được yêu cầu.\n4. Quét mã QR tại khu vực tổ chức.';
  }
  if (/\b(đăng ký|tham gia)\b/i.test(message) && !isEventSearchQuestion(message)) {
    return 'Để đăng ký, bạn mở sự kiện trong mục Khám phá và nhấn “Đăng ký tham gia ngay”. Khi có thông báo, nghĩa là bạn đã đăng ký thành công.';
  }
  const matches = isUpcomingEventsQuestion(message) ? events.slice(0, 5) : findMatchingEvents(message, events);

  if (matches.length > 0) {
    return `Mình tìm thấy ${matches.length} sự kiện phù hợp. Bạn hãy chọn một Card bên dưới để xem chi tiết hoặc đăng ký.`;
  }

  if (isEventSearchQuestion(message) || hasLocationConstraint(message)) {
    return hasLocationConstraint(message)
      ? 'Hiện chưa tìm thấy sự kiện nào tại địa điểm bạn vừa hỏi. Bạn hãy thử tên tòa nhà/phòng khác.'
      : 'Hiện chưa có sự kiện phù hợp với tiêu chí bạn vừa nhập. Bạn hãy thử tìm theo chủ đề, ban tổ chức hoặc địa điểm khác.';
  }

  return 'Mình có thể giúp bạn tìm sự kiện theo chủ đề, địa điểm hoặc thời gian. Bạn hãy hỏi cụ thể hơn nhé!';
}

async function fetchWithProviderRetry(url: string, init: RequestInit) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, init);
    if (response.ok || ![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) return response;
    await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
  }
  throw new Error('AI_PROVIDER_UNAVAILABLE');
}

async function requestProvider(messages: ChatMessage[], events: EventDocument[]) {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) return null;

  const configuredUrl = (process.env.AI_BASE_URL?.trim() || 'https://api.openai.com/v1/chat/completions').replace(/\/+$/, '');
  const baseUrl = configuredUrl.endsWith('/chat/completions')
    ? configuredUrl
    : `${configuredUrl}/chat/completions`;
  const model = process.env.AI_MODEL?.trim() || 'gpt-4o-mini';
  const eventContext = events.map((event) => ({
    title: trim(event.title, 160),
    category: event.category,
    organizer: trim(event.organizer, 160),
    location: trim(event.location, 160),
    startsAt: event.startsAt.toISOString(),
    description: trim(event.description, 500),
  }));

  const response = await fetchWithProviderRetry(baseUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: [
            'Bạn là trợ lý AI của ứng dụng IUH Event, trả lời bằng tiếng Việt, ngắn gọn và thân thiện.',
            'Chỉ tư vấn dựa trên dữ liệu sự kiện được cung cấp; không bịa lịch, địa điểm hoặc chính sách.',
            'Nếu câu hỏi không liên quan IUH Event, hãy nói rõ phạm vi hỗ trợ và không đề xuất sự kiện.',
            'Nếu người dùng hỏi về vé thất lạc, sai thông tin hoặc sự cố đặc biệt, hãy trấn an và hướng dẫn liên hệ trực tiếp Phòng tổ chức sự kiện IUH.',
            'Trả lời tiếng Việt, ngắn gọn, lịch sự, xuống dòng hợp lý để đọc trên điện thoại.',
            'Nếu không đủ dữ liệu, hãy nói rõ và hướng dẫn người dùng mở mục Khám phá hoặc Hồ sơ.',
            `Dữ liệu sự kiện sắp diễn ra: ${JSON.stringify(eventContext)}`,
          ].join('\n'),
        },
        ...messages,
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    console.warn(`[chat] AI provider unavailable (${response.status}); using fallback response.`);
    return null;
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  return typeof content === 'string' && content.trim() ? content.trim().slice(0, 2_000) : null;
}

export function createChatRouter(db: Db) {
  const router = Router();
  const events = db.collection<EventDocument>('events');

  router.post('/', requireAuth(db), async (req, res) => {
    const input = chatSchema.parse(req.body);
    const publishedEvents = await events.find({
      status: 'published',
    }).sort({ startsAt: 1 }).limit(500).toArray();
    const upcomingEvents = publishedEvents.filter((event) => event.startsAt.getTime() > Date.now());
    const latestUserMessage = input.messages.filter((message) => message.role === 'user').at(-1)?.content;
    if (!latestUserMessage) throw badRequest('MESSAGE_REQUIRED', 'Vui lòng nhập câu hỏi.');

    const namedEvent = findNamedEvent(latestUserMessage, publishedEvents);
    const related = isEventRelated(latestUserMessage) || Boolean(namedEvent);
    const isFixedFaq = isSupportQuestion(latestUserMessage)
      || isRegistrationQuestion(latestUserMessage)
      || isCheckInQuestion(latestUserMessage);
    const shouldShowEvents = related
      && (isEventSearchQuestion(latestUserMessage)
        || isUpcomingEventsQuestion(latestUserMessage)
        || isDateSearchQuestion(latestUserMessage)
        || Boolean(namedEvent))
      && !isIncidentQuestion(latestUserMessage)
      && !isFixedFaq;
    let providerReply: string | null = null;
    if (related && !shouldShowEvents && !isIncidentQuestion(latestUserMessage)
      && !isFixedFaq) {
      try {
        providerReply = await requestProvider(input.messages, upcomingEvents.slice(0, 20));
      } catch (error) {
        console.warn('[chat] AI provider request failed; using event fallback.', error);
      }
    }
    const reply = shouldShowEvents || isFixedFaq
      ? buildFallbackReply(latestUserMessage, isUpcomingEventsQuestion(latestUserMessage) ? upcomingEvents : publishedEvents)
      : providerReply ?? buildFallbackReply(latestUserMessage, publishedEvents);
    const eventMatches = isUpcomingEventsQuestion(latestUserMessage)
      ? upcomingEvents.slice(0, 5)
      : namedEvent
        ? [namedEvent]
        : findMatchingEvents(latestUserMessage, publishedEvents);
    const matchedEvents = shouldShowEvents ? eventMatches.map(toChatEvent) : [];

    res.json({
      data: {
        role: 'assistant',
        content: reply,
        source: providerReply ? 'ai' : 'fallback',
        events: matchedEvents,
      },
    });
  });

  return router;
}
