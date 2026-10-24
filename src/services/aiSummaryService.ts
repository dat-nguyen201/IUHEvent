import type { StudentEvent } from '@/types/events';

const MAX_SUMMARY_LENGTH = 1200;
const REQUEST_TIMEOUT_MS = 8000;

type SummaryPayload = Pick<
  StudentEvent,
  'title' | 'description' | 'startsAt' | 'location' | 'category' | 'organizer' | 'summarySource'
>;

export type EventSummaryResult = {
  text: string;
  source: 'remote' | 'demo';
  notice?: string;
};

function limitText(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function toPayload(event: StudentEvent): SummaryPayload {
  return {
    title: limitText(event.title, 180),
    description: limitText(event.description, 700),
    startsAt: limitText(event.startsAt, 80),
    location: limitText(event.location, 180),
    category: event.category,
    organizer: limitText(event.organizer, 180),
    summarySource: limitText(event.summarySource, 700),
  };
}

function createDemoSummary(event: StudentEvent): string {
  const topic = event.summarySource.trim() || event.description.trim();
  const shortTopic = limitText(topic, 260);

  return [
    `• ${event.title} là hoạt động thuộc nhóm ${event.category}.`,
    `• Nội dung chính: ${shortTopic}`,
    `• Thời gian và địa điểm: ${event.startsAt} tại ${event.location}.`,
    `• Đơn vị tổ chức: ${event.organizer}.`,
  ].join('\n');
}

function parseRemoteSummary(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const candidate = typeof record.summary === 'string' ? record.summary : record.text;
  if (typeof candidate !== 'string') return null;

  const summary = candidate.trim().slice(0, MAX_SUMMARY_LENGTH);
  return summary.length >= 20 ? summary : null;
}

export async function getEventSummary(event: StudentEvent): Promise<EventSummaryResult> {
  const fallback = createDemoSummary(event);
  const endpoint = process.env.EXPO_PUBLIC_AI_SUMMARY_URL?.trim();

  if (!endpoint) {
    return {
      text: fallback,
      source: 'demo',
      notice: 'Đang dùng tóm tắt demo vì chưa cấu hình máy chủ AI.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: toPayload(event) }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        text: fallback,
        source: 'demo',
        notice: 'Máy chủ AI chưa sẵn sàng, nên đang hiển thị tóm tắt demo.',
      };
    }

    const summary = parseRemoteSummary(await response.json());
    if (!summary) {
      return {
        text: fallback,
        source: 'demo',
        notice: 'Phản hồi AI không hợp lệ, nên đang hiển thị tóm tắt demo.',
      };
    }

    return { text: summary, source: 'remote' };
  } catch (error) {
    const errorName = error instanceof Error ? error.name : '';
    const notice = errorName === 'AbortError'
      ? 'Máy chủ AI phản hồi quá lâu, nên đang hiển thị tóm tắt demo.'
      : 'Không kết nối được máy chủ AI, nên đang hiển thị tóm tắt demo.';

    return { text: fallback, source: 'demo', notice };
  } finally {
    clearTimeout(timeout);
  }
}
