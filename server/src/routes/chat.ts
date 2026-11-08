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
  'học thuật', 'clb', 'tình nguyện', 'giải trí',
];

function isEventRelated(message: string) {
  const normalized = message.toLocaleLowerCase('vi-VN');
  if (OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  return EVENT_TERMS.some((term) => normalized.includes(term));
}

function isIncidentQuestion(message: string) {
  return /\b(không tìm thấy|thất lạc|sai thông tin|lỗi|sự cố|không nhận được|không vào được|vé)\b/i.test(message);
}

function trim(value: string, length: number) {
  return value.trim().slice(0, length);
}

function findMatchingEvents(message: string, events: EventDocument[]) {
  const query = message.toLocaleLowerCase('vi-VN');
  const words = query.split(/\s+/).filter((word) => word.length > 2 && !['sự', 'kiện', 'nào', 'này', 'có', 'không'].includes(word));
  const matches = events.filter((event) => {
    const searchable = `${event.title} ${event.category} ${event.organizer} ${event.location}`.toLocaleLowerCase('vi-VN');
    return words.length === 0 || words.some((word) => searchable.includes(word));
  });
  return (matches.length > 0 ? matches : events).slice(0, 5);
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
  if (!isEventRelated(message)) {
    return 'Mình là trợ lý của IUH Event nên chỉ hỗ trợ thông tin về sự kiện, lịch chương trình, đăng ký và check-in. Bạn có thể hỏi mình về một sự kiện cụ thể nhé.';
  }
  if (isIncidentQuestion(message)) {
    return 'Mình rất tiếc vì bạn đang gặp sự cố. Bạn vui lòng kiểm tra lại email/vé và thông tin đăng ký. Nếu vẫn chưa được giải quyết, hãy liên hệ trực tiếp Phòng tổ chức sự kiện IUH để được hỗ trợ nhanh nhất.';
  }
  const matches = findMatchingEvents(message, events);

  if (matches.length > 0) {
    return [
      `Mình tìm thấy ${matches.length} sự kiện có thể phù hợp với bạn:`,
      ...matches.map((event) => `• ${event.title} — ${event.location} — ${event.startsAt.toLocaleString('vi-VN')}`),
      'Bạn có thể mở mục Khám phá để xem chi tiết và đăng ký.',
    ].join('\n');
  }

  if (events.length > 0) {
    return [
      'Mình có thể giúp bạn tìm sự kiện theo chủ đề, địa điểm hoặc thời gian.',
      `Hiện có ${events.length} sự kiện sắp diễn ra trong hệ thống.`,
      'Ví dụ: “Tìm sự kiện học thuật tuần này” hoặc “Có hoạt động tình nguyện nào không?”',
    ].join('\n');
  }

  return 'Hiện chưa có sự kiện sắp diễn ra. Bạn hãy thử lại sau hoặc kiểm tra mục Thông báo nhé.';
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

  const response = await fetch(baseUrl, {
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
    const errorBody = await response.text().catch(() => '');
    console.warn(`[chat] AI provider returned ${response.status}: ${errorBody.slice(0, 500)}`);
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
    const latestEvents = await events.find({
      status: 'published',
      startsAt: { $gt: new Date() },
    }).sort({ startsAt: 1 }).limit(20).toArray();
    const latestUserMessage = input.messages.filter((message) => message.role === 'user').at(-1)?.content;
    if (!latestUserMessage) throw badRequest('MESSAGE_REQUIRED', 'Vui lòng nhập câu hỏi.');

    const related = isEventRelated(latestUserMessage);
    let providerReply: string | null = null;
    if (related) {
      try {
        providerReply = await requestProvider(input.messages, latestEvents);
      } catch (error) {
        console.warn('[chat] AI provider request failed; using event fallback.', error);
      }
    }
    const reply = providerReply ?? buildFallbackReply(latestUserMessage, latestEvents);
    const matchedEvents = related && !isIncidentQuestion(latestUserMessage)
      ? findMatchingEvents(latestUserMessage, latestEvents).map(toChatEvent)
      : [];

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
