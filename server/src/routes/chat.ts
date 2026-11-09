import { Router } from 'express';
import { type Db } from 'mongodb';

import { badRequest } from '../lib/errors';
import { chatSchema, resolveCampusSchema } from '../lib/validation';
import { requireAuth } from '../middleware/auth';
import type {
  EventDocument,
  RegistrationDocument,
  SavedEventDocument,
  StoredUser,
  UserDocument,
} from '../types/domain';

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

interface UserActivityContext {
  user: StoredUser;
  rank: number;
  totalStudents: number;
  drlPoints: number;
  badge: string;
  checkedInEvents: EventDocument[];
  upcomingRegisteredEvents: EventDocument[];
  savedEvents: EventDocument[];
  preferredCategories: string[];
}

const OFF_TOPIC_PATTERNS = [
  /\b(lập trình|code|javascript|python|html|css|sql|toán|vật lý|hóa học)\b/i,
  /\b(thời tiết|chứng khoán|bóng đá|tin tức|phim|nhạc|du lịch|nấu ăn)\b/i,
  /\b(vé máy bay|đặt phòng|ship hàng)\b/i,
  /\b(meme|truyện|bài tập|game|hack)\b/i,
];

const EVENT_TERMS = [
  'sự kiện', 'chương trình', 'hoạt động', 'hội thảo', 'workshop', 'talkshow',
  'đăng ký', 'vé', 'check-in', 'check in', 'qr', 'địa điểm', 'thời gian',
  'bắt đầu', 'tham gia', 'ban tổ chức', 'phòng tổ chức', 'còn chỗ', 'số người',
  'học thuật', 'clb', 'tình nguyện', 'giải trí', 'tòa nhà', 'toà nhà',
  'tòa', 'toà', 'phòng', 'khu', 'cơ sở', 'ở đâu', 'tại đâu',
  'bảng xếp hạng', 'xếp hạng', 'thứ mấy', 'điểm rèn luyện', 'drl', 'huy hiệu',
  'mật khẩu', 'quên mật khẩu', 'đổi mật khẩu', 'chứng nhận', 'ngoại tuyến',
  'bxh', 'thứ hạng', 'hạng', 'vị trí', 'bản đồ', 'sơ đồ', 'chỉ đường', 'đường đi',
  'quảng ngãi', 'thanh hóa', 'nguyễn văn dung', 'nguyễn văn bảo',
];

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

function isEventRelated(message: string) {
  const norm = normalizeSearchText(message);
  if (OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(norm))) return false;
  return EVENT_TERMS.some((term) => norm.includes(normalizeSearchText(term)));
}

// 1. Leaderboard & DRL Ranking
function isLeaderboardQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\b(bang xep hang|bxh|thu hang|xep hang|hang may|thu may|vi tri.*thu may|vi tri|xep thu|dung thu|diem ren luyen|diem drl|drl|huy hieu|diem cua toi)\b/i.test(norm);
}

// 2. Checked-in History
function isCheckedInHistoryQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\b(da check[\s-]?in|da tham gia|da di|lich su tham gia|cac su kien toi da|su kien da hoan thanh|diem danh roi)\b/i.test(norm)
    && !/\b(chua|huong dan check[\s-]?in|cach check[\s-]?in)\b/i.test(norm);
}

// 3. Registered / Upcoming / My Tickets / Not checked in
function isMyRegisteredEventsQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\b(chua check[\s-]?in|da dang ky|ve cua toi|lich cua toi|su kien cua toi|sap tham gia|toi co su kien nao|toi sap di dau|lich tham gia cua toi)\b/i.test(norm)
    && !/\b(cach dang ky|huong dan dang ky|dang ky nhu the nao)\b/i.test(norm);
}

// 4. Saved / Bookmarked Events
function isMySavedEventsQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\b(da luu|quan tam|yeu thich|bookmark|su kien toi luu|danh sach quan tam|su kien quan tam)\b/i.test(norm);
}

// 5. Personalized Recommendation
function isPersonalizedRecommendationQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\b(goi y cho toi|phu hop voi toi|danh cho toi|toi nen tham gia|su kien cho nganh|nganh cua toi|theo so thich|de xuat cho toi)\b/i.test(norm);
}

// 6. Account & Password Management
function isPasswordOrAccountQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\b(doi mat khau|quen mat khau|mat khau|doi pass|reset pass|cap nhat ho so|sua ho so|thong tin ca nhan|thong tin tai khoan)\b/i.test(norm);
}

// 7. Offline Ticket Pass
function isOfflineTicketQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\b(ve ngoai tuyen|ngoai tuyen|offline|mat mang|khong co mang|khong co 4g|het 4g|nghen mang|khong co internet)\b/i.test(norm);
}

// 8. E-Certificate
function isCertificateQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\b(chung nhan|giay chung nhan|e-certificate|certificate|chung chi|minh chung tham gia|lay chung nhan|tai chung nhan)\b/i.test(norm);
}

// 9. Campus Location / Directions
function isCampusMapQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\b(ban do|so do|o dau|tai dau|dia diem|chi duong|duong di|toa nha|nha a|nha b|nha c|nha d|nha e|nha f|nha g|nha h|nha i|nha t|nha v|nha x|hoi truong|phong)\b/i.test(norm)
    || norm.includes('co so') || norm.includes('quang ngai') || norm.includes('thanh hoa') || norm.includes('nguyen van dung') || norm.includes('nguyen van bao');
}

function isIncidentQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\b(khong tim thay|that lac|sai thong tin|loi|su co|khong nhan duoc|khong vao duoc)\b/i.test(norm);
}

function isSupportQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return norm.includes('can nguoi ho tro')
    || norm.includes('can mot nguoi ho tro')
    || norm.includes('can ho tro')
    || norm.includes('gap nguoi ho tro')
    || norm.includes('lien he ho tro');
}

function isEventSearchQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\b(tim|goi y|danh sach|co .* nao|su kien nao|chuong trinh nao|hoat dong nao|workshop nao)\b/i.test(norm);
}

function isUpcomingEventsQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\bsap dien ra\b/i.test(norm)
    && /\b(su kien|chuong trinh|hoat dong)\b/i.test(norm);
}

function isTomorrowQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\b(ngay\s+mai|mai)\b/i.test(norm) && /\b(su kien|chuong trinh|hoat dong|dien ra)\b/i.test(norm);
}

function isThisMonthQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\b(thang\s+nay|trong\s+thang\s+nay)\b/i.test(norm) && /\b(su kien|chuong trinh|hoat dong|dien ra)\b/i.test(norm);
}

function isDateSearchQuestion(message: string) {
  return isTomorrowQuestion(message) || isThisMonthQuestion(message);
}

function isRegistrationQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\b(huong dan|cach)\s+(dang\s+ky|su kien)\b|\bdang\s+ky\s+su kien\b/i.test(norm);
}

function isCheckInQuestion(message: string) {
  const norm = normalizeSearchText(message);
  return /\b(cach check[\s-]?in bang qr|check[\s-]?in bang qr|check[\s-]?in qr|huong dan check[\s-]?in|quet qr)\b/i.test(norm);
}

function hasLocationConstraint(message: string) {
  return /\b(tòa|toà|phòng|khu|cơ sở)\s+(?!nào\b|đâu\b)[a-z0-9][a-z0-9 .-]*/i.test(message);
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

// ---------------------------------------------------------------------------
// Personalized Activity Helper & Answer Builders
// ---------------------------------------------------------------------------

async function fetchUserActivityContext(db: Db, user: StoredUser): Promise<UserActivityContext> {
  const usersCol = db.collection<UserDocument>('users');
  const registrationsCol = db.collection<RegistrationDocument>('registrations');
  const savedEventsCol = db.collection<SavedEventDocument>('savedEvents');
  const eventsCol = db.collection<EventDocument>('events');

  const [userRegistrations, userSaved, allCheckIns, allActiveUsers, allEvents] = await Promise.all([
    registrationsCol.find({ userId: user._id }).toArray(),
    savedEventsCol.find({ userId: user._id }).toArray(),
    registrationsCol.find({ status: 'checked-in' }).toArray(),
    usersCol.find({ status: 'active' }).toArray(),
    eventsCol.find({ status: 'published' }).toArray(),
  ]);

  const eventMap = new Map<string, EventDocument>(allEvents.map((e) => [e.id, e]));

  // Calculate check-in count for all users to get exact rank
  const checkInCountMap = new Map<string, number>();
  for (const reg of allCheckIns) {
    const uid = String(reg.userId);
    checkInCountMap.set(uid, (checkInCountMap.get(uid) || 0) + 1);
  }

  const myUid = user._id.toHexString();
  const myCheckedInCount = checkInCountMap.get(myUid) || 0;
  const myDrl = Math.min(100, 65 + myCheckedInCount * 5);

  let myBadge = '🥉 Tích cực';
  if (myDrl >= 90) myBadge = '🏆 Xuất sắc';
  else if (myDrl >= 80) myBadge = '🥇 Tiêu biểu';
  else if (myDrl >= 70) myBadge = '🥈 Năng động';

  const userScores = allActiveUsers.map((s) => {
    const uid = s._id.toHexString();
    const count = checkInCountMap.get(uid) || 0;
    const drl = Math.min(100, 65 + count * 5);
    return { uid, drl, count };
  });

  userScores.sort(
    (a, b) => b.drl - a.drl || b.count - a.count || a.uid.localeCompare(b.uid),
  );
  const myRankIndex = userScores.findIndex((s) => s.uid === myUid);
  const rank = myRankIndex >= 0 ? myRankIndex + 1 : userScores.length;

  const checkedInEvents: EventDocument[] = [];
  const upcomingRegisteredEvents: EventDocument[] = [];

  for (const reg of userRegistrations) {
    const ev = eventMap.get(reg.eventId);
    if (!ev) continue;
    if (reg.status === 'checked-in') {
      checkedInEvents.push(ev);
    } else if (reg.status === 'registered') {
      upcomingRegisteredEvents.push(ev);
    }
  }

  upcomingRegisteredEvents.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  checkedInEvents.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

  const savedEventsList: EventDocument[] = [];
  for (const s of userSaved) {
    const ev = eventMap.get(s.eventId);
    if (ev) savedEventsList.push(ev);
  }

  const catCount: Record<string, number> = {};
  for (const ev of [...checkedInEvents, ...savedEventsList, ...upcomingRegisteredEvents]) {
    catCount[ev.category] = (catCount[ev.category] || 0) + 1;
  }
  const preferredCategories = Object.entries(catCount)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  return {
    user,
    rank,
    totalStudents: allActiveUsers.length || 1,
    drlPoints: myDrl,
    badge: myBadge,
    checkedInEvents,
    upcomingRegisteredEvents,
    savedEvents: savedEventsList,
    preferredCategories,
  };
}

function buildLeaderboardReply(ctx: UserActivityContext): string {
  const name = ctx.user.name;
  const rank = ctx.rank;
  const total = ctx.totalStudents;
  const drl = ctx.drlPoints;
  const badge = ctx.badge;
  const count = ctx.checkedInEvents.length;

  let nextGoal = '';
  if (drl >= 100) {
    nextGoal = '🎉 Xuất sắc! Bạn đã đạt mức điểm rèn luyện tối đa (100/100 điểm)!';
  } else if (drl >= 90) {
    nextGoal = `💡 Bạn đang sở hữu Huy hiệu Xuất sắc! Hãy tham gia thêm ${Math.ceil((100 - drl) / 5)} sự kiện nữa để đạt trọn vẹn 100 điểm nhé.`;
  } else if (drl >= 80) {
    nextGoal = `💡 Bạn cần tham gia thêm ${Math.ceil((90 - drl) / 5)} sự kiện check-in nữa để thăng hạng lên Huy hiệu 🏆 Xuất sắc (từ 90 điểm)!`;
  } else if (drl >= 70) {
    nextGoal = `💡 Bạn cần tham gia thêm ${Math.ceil((80 - drl) / 5)} sự kiện check-in nữa để thăng hạng lên Huy hiệu 🥇 Tiêu biểu (từ 80 điểm)!`;
  } else {
    nextGoal = `💡 Mỗi sự kiện check-in thành công sẽ cộng +5 điểm ĐRL. Hãy tích cực tham gia để thăng hạng nhé!`;
  }

  return [
    `Chào ${name}! Đây là thông tin xếp hạng rèn luyện của bạn:`,
    `🏆 Thứ hạng: Đang đứng vị trí #${rank} trên tổng số ${total} sinh viên.`,
    `⭐ Điểm rèn luyện: ${drl}/100 điểm (Huy hiệu ${badge}).`,
    `✅ Số sự kiện đã check-in thành công: ${count} sự kiện.`,
    nextGoal,
    `👉 Bạn có thể vào mục Bảng xếp hạng ở Trang chủ để xem Top sinh viên dẫn đầu và xếp hạng Khoa của mình!`,
  ].join('\n');
}

function buildCheckedInHistoryReply(ctx: UserActivityContext): { text: string; events: EventDocument[] } {
  if (ctx.checkedInEvents.length === 0) {
    return {
      text: `Chào ${ctx.user.name}, hiện tại bạn chưa check-in sự kiện nào.\nKhi đến tham gia sự kiện, bạn chỉ cần mở ứng dụng và quét mã QR tại khu vực tổ chức để được điểm danh và cộng +5 điểm rèn luyện nhé!`,
      events: [],
    };
  }

  const list = ctx.checkedInEvents.slice(0, 5).map((e, idx) => {
    const d = new Date(e.startsAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${idx + 1}. ${e.title} (${d} · ${e.location})`;
  }).join('\n');

  return {
    text: [
      `Chào ${ctx.user.name}! Bạn đã check-in thành công ${ctx.checkedInEvents.length} sự kiện:`,
      list,
      `🎖️ Bạn đã nhận được +${ctx.checkedInEvents.length * 5} điểm ĐRL từ các sự kiện này.`,
      `📄 Bạn có thể bấm vào thẻ sự kiện bên dưới để xem lại hoặc xuất Giấy chứng nhận điện tử (E-Certificate)!`,
    ].join('\n'),
    events: ctx.checkedInEvents.slice(0, 5),
  };
}

function buildMyRegisteredEventsReply(ctx: UserActivityContext): { text: string; events: EventDocument[] } {
  if (ctx.upcomingRegisteredEvents.length === 0) {
    return {
      text: `Chào ${ctx.user.name}, hiện tại bạn chưa có sự kiện nào đã đăng ký sắp tới.\nBạn có thể duyệt qua các sự kiện ở tab Khám phá hoặc hỏi mình để tìm sự kiện phù hợp nhé!`,
      events: [],
    };
  }

  const list = ctx.upcomingRegisteredEvents.slice(0, 5).map((e, idx) => {
    const d = new Date(e.startsAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `${idx + 1}. ${e.title} (Bắt đầu: ${d} · ${e.location})`;
  }).join('\n');

  return {
    text: [
      `Chào ${ctx.user.name}! Bạn đang có ${ctx.upcomingRegisteredEvents.length} sự kiện đã đăng ký chờ tham gia:`,
      list,
      `📱 Khi đến nơi, bạn mở thẻ sự kiện để quét mã QR check-in.`,
      `📶 Nếu hội trường đông người nghẽn mạng 4G/Wi-Fi, bạn có thể vào tab "Hồ sơ > Vé sự kiện ngoại tuyến" để mở thẻ điểm danh offline bình thường!`,
    ].join('\n'),
    events: ctx.upcomingRegisteredEvents.slice(0, 5),
  };
}

function buildMySavedEventsReply(ctx: UserActivityContext): { text: string; events: EventDocument[] } {
  if (ctx.savedEvents.length === 0) {
    return {
      text: `Chào ${ctx.user.name}, bạn chưa lưu sự kiện nào vào danh sách quan tâm.\nKhi xem các sự kiện ở mục Khám phá hoặc Trang chủ, bạn có thể nhấn biểu tượng bookmark (lưu) để theo dõi lại bất kỳ lúc nào!`,
      events: [],
    };
  }

  const list = ctx.savedEvents.slice(0, 5).map((e, idx) => {
    const d = new Date(e.startsAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    return `${idx + 1}. ${e.title} (${d} · ${e.organizer})`;
  }).join('\n');

  return {
    text: [
      `Chào ${ctx.user.name}! Bạn đang quan tâm ${ctx.savedEvents.length} sự kiện đã lưu:`,
      list,
      `⚡ Nhớ bấm vào thẻ sự kiện bên dưới để đăng ký sớm giữ chỗ nhé!`,
    ].join('\n'),
    events: ctx.savedEvents.slice(0, 5),
  };
}

function buildPersonalizedRecommendationReply(ctx: UserActivityContext, allUpcomingEvents: EventDocument[]): { text: string; events: EventDocument[] } {
  const registeredIds = new Set([
    ...ctx.upcomingRegisteredEvents.map((e) => e.id),
    ...ctx.checkedInEvents.map((e) => e.id),
  ]);
  const availableUpcoming = allUpcomingEvents.filter((e) => !registeredIds.has(e.id));

  const scored = availableUpcoming.map((e) => {
    let score = 0;
    if (ctx.preferredCategories.includes(e.category)) {
      score += 10 - ctx.preferredCategories.indexOf(e.category) * 2;
    }
    const majorLower = (ctx.user.major || '').toLowerCase();
    if (majorLower.includes('thông tin') || majorLower.includes('cntt') || majorLower.includes('máy tính')) {
      if (e.category === 'Học thuật' || /công nghệ|lập trình|ai|data|it|tin học|an toàn/i.test(e.title + e.description)) score += 5;
    } else if (majorLower.includes('kinh doanh') || majorLower.includes('quản trị') || majorLower.includes('kinh tế')) {
      if (/kinh tế|doanh nghiệp|khởi nghiệp|marketing|tài chính/i.test(e.title + e.description)) score += 5;
    }
    return { event: e, score };
  });

  scored.sort((a, b) => b.score - a.score || a.event.startsAt.getTime() - b.event.startsAt.getTime());
  const recommended = scored.slice(0, 4).map((s) => s.event);

  if (recommended.length === 0) {
    return {
      text: `Hiện chưa có sự kiện mới nào chưa đăng ký. Bạn đã tham gia rất tích cực! Hãy theo dõi thêm các thông báo sự kiện mới nhé.`,
      events: [],
    };
  }

  const prefText = ctx.preferredCategories.length > 0
    ? `Dựa vào chuyên ngành ${ctx.user.major || 'của bạn'} và các chủ đề bạn hay quan tâm (${ctx.preferredCategories.slice(0, 2).join(', ')}), mình gợi ý các sự kiện phù hợp nhất:`
    : `Dựa vào chuyên ngành ${ctx.user.major || 'của bạn'}, mình gợi ý các sự kiện tiêu biểu sắp diễn ra:`;

  return {
    text: [
      `Chào ${ctx.user.name}!`,
      prefText,
      `Bấm vào thẻ bên dưới để xem chi tiết và đăng ký giữ chỗ ngay nhé:`,
    ].join('\n'),
    events: recommended,
  };
}

function buildPasswordOrAccountReply(): string {
  return [
    '🔐 Hướng dẫn quản lý mật khẩu & tài khoản:',
    '1. Đổi mật khẩu:',
    '   - Mở tab "Hồ sơ" (góc dưới bên phải màn hình).',
    '   - Chọn mục "Đổi mật khẩu".',
    '   - Nhập mật khẩu hiện tại và mật khẩu mới (tối thiểu 6 ký tự).',
    '2. Quên mật khẩu:',
    '   - Đăng xuất ra màn hình Đăng nhập.',
    '   - Nhấn "Quên mật khẩu?".',
    '   - Nhập email trường IUH để nhận mã OTP khôi phục mật khẩu trong 10 phút.',
    '3. Cập nhật hồ sơ:',
    '   - Vào tab "Hồ sơ" để chỉnh sửa tên hiển thị, chuyên ngành hoặc xem mã sinh viên của bạn.',
  ].join('\n');
}

function buildOfflineTicketReply(): string {
  return [
    '📱 Tính năng Ví vé sự kiện ngoại tuyến (Offline Ticket Pass):',
    '- Tự động lưu: Khi bạn đăng ký sự kiện, toàn bộ thông tin vé và mã QR sẽ tự động được lưu offline vào máy.',
    '- Sử dụng khi mất mạng: Khi đến hội trường đông người làm sóng 4G/Wi-Fi bị nghẽn, bạn chỉ cần vào tab "Hồ sơ" > chọn "Vé sự kiện ngoại tuyến".',
    '- Điểm danh bình thường: Mở thẻ vé để nhân viên BTC quét mã QR check-in ngay cả khi điện thoại tắt kết nối mạng hoàn toàn!',
  ].join('\n');
}

function buildCertificateReply(): string {
  return [
    '📜 Giấy chứng nhận điện tử (E-Certificate):',
    '- Điều kiện cấp: Sau khi bạn check-in thành công và sự kiện đã kết thúc.',
    '- Cách tải:',
    '  1. Vào tab "Lịch trình" hoặc "Hồ sơ" > chọn sự kiện bạn đã tham gia.',
    '  2. Bấm vào nút "Xuất giấy chứng nhận".',
    '  3. Bạn có thể xem trước mẫu chứng nhận có dấu xác nhận của IUH Event và chọn Lưu ảnh hoặc Xuất file PDF để làm minh chứng điểm rèn luyện!',
  ].join('\n');
}

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

function resolveIUHCampusLocation(message: string): CampusMapAction | null {
  const norm = normalizeSearchText(message);

  // 1. Phân hiệu Quảng Ngãi
  if (norm.includes('quang ngai')) {
    return {
      campusId: 'quang_ngai',
      campusName: 'ĐH Công nghiệp TP.HCM - Phân hiệu Quảng Ngãi',
      address: 'Số 938 Quang Trung, TP. Quảng Ngãi, Tỉnh Quảng Ngãi',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=15.111874,108.795844',
      hasInternalMap: false,
    };
  }

  // 2. Cơ sở Thanh Hóa
  if (norm.includes('thanh hoa') || norm.includes('quang tam')) {
    return {
      campusId: 'thanh_hoa',
      campusName: 'ĐH Công nghiệp TP.HCM - Cơ sở Thanh Hóa',
      address: 'Xã Quảng Tâm, TP. Thanh Hóa, Tỉnh Thanh Hóa',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=19.761502,105.828699',
      hasInternalMap: false,
    };
  }

  // 3. Cơ sở 2 (Nguyễn Văn Dung, Gò Vấp)
  if (
    norm.includes('co so 2')
    || norm.includes('cs2')
    || norm.includes('nguyen van dung')
    || norm.includes('pham van chieu')
    || norm.includes('san bong')
    || norm.includes('san van dong')
    || norm.includes('giao duc the chat')
    || norm.includes('nha thi dau')
    || norm.includes('the chat')
    || norm.includes('the thao')
  ) {
    return {
      campusId: 'cs2',
      campusName: 'ĐH Công nghiệp TP.HCM - Cơ sở 2 (Gò Vấp)',
      address: 'Số 20 Nguyễn Văn Dung, Phường 6, Quận Gò Vấp, TP.HCM',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=10.844754,106.684128',
      hasInternalMap: false,
    };
  }

  // 4. Trụ sở chính (12 Nguyễn Văn Bảo, Gò Vấp)
  const isMainCampusMatch = /\b(co so 1|co so chinh|tru so chinh|nguyen van bao|hoi truong a7|hoi truong e4|toa nha|nha [abcdefghitvx]|phong [abcdefghitvx]|lab [abcdefghitvx]|ban do|so do|chi duong|o dau|tai dau)\b/i.test(norm)
    || /\b[abcdefghitvx]\d{1,2}(?:[.\-/]\d{1,3})?\b/i.test(norm);

  if (!isMainCampusMatch && !/\b(dia diem|khuon vien|co so)\b/i.test(norm)) {
    return null;
  }

  const buildingMatch = norm.match(/\b(?:nha|toa|khu|phong|lab|hoi truong)\s+([abcdefghitvx])\b/i)
    || norm.match(/\b([abcdefghitvx])\d{1,2}(?:[.\-/]\d{1,3})?\b/i);
  const buildingCode = buildingMatch ? buildingMatch[1].toUpperCase() : null;

  const roomMatch = message.match(/\b(?:Phòng|Lab|Hội trường)?\s*([A-Za-z]\d{1,2}(?:[.\-/]\d{1,3})?)\b/i);
  const room = roomMatch ? roomMatch[1].toUpperCase() : null;
  const floorMatch = room ? room.match(/[A-Za-z](\d{1,2})/) : null;
  const floorHint = floorMatch ? `Tầng ${floorMatch[1]}` : null;

  return {
    campusId: 'main',
    campusName: 'Trụ sở chính IUH (Cơ sở 1 - Gò Vấp)',
    address: 'Số 12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP. Hồ Chí Minh',
    buildingCode,
    room,
    floorHint,
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=10.822159,106.687483',
    hasInternalMap: true,
  };
}

function buildCampusMapReply(action: CampusMapAction, message: string): string {
  if (action.campusId === 'quang_ngai') {
    return [
      `📍 Đây là phân hiệu ngoài TP.HCM của IUH:`,
      `🏢 ${action.campusName}`,
      `📌 Địa chỉ: ${action.address}`,
      `- Đào tạo kỹ sư, cử nhân và liên kết các tỉnh khu vực miền Trung - Tây Nguyên.`,
      `👉 Bạn có thể bấm nút "Chỉ đường Google Maps" bên dưới để xem định vị và đường đi nhé!`,
    ].join('\n');
  }

  if (action.campusId === 'thanh_hoa') {
    return [
      `📍 Đây là cơ sở đào tạo khu vực phía Bắc của IUH:`,
      `🏢 ${action.campusName}`,
      `📌 Địa chỉ: ${action.address}`,
      `- Phục vụ nghiên cứu và đào tạo khu vực Bắc Trung Bộ.`,
      `👉 Bạn có thể bấm nút "Chỉ đường Google Maps" bên dưới để mở điều hướng bản đồ!`,
    ].join('\n');
  }

  if (action.campusId === 'cs2') {
    return [
      `📍 Địa điểm này thuộc Cơ sở 2 của IUH:`,
      `🏢 ${action.campusName}`,
      `📌 Địa chỉ: ${action.address}`,
      `- Cách trụ sở chính khoảng 3km, là nơi học giáo dục thể chất, sân bóng đá, trung tâm thực hành và ký túc xá sinh viên.`,
      `👉 Bạn có thể bấm nút "Chỉ đường Google Maps" bên dưới để nhận chỉ đường chi tiết!`,
    ].join('\n');
  }

  // Main campus
  const building = action.buildingCode;
  const room = action.room;
  const floor = action.floorHint;

  let specificNote = '';
  if (building === 'A') {
    specificNote = 'Nhà A nằm ở phía bên trái khuôn viên, ngay gần Cổng số 1 (đường Nguyễn Văn Bảo). Hội trường A7 nằm trong khu nhà A.';
  } else if (building === 'B') {
    specificNote = 'Nhà B màu xanh đậm nằm phía trên nhà H, sát đường Nguyễn Thái Sơn và gần nhà V.';
  } else if (building === 'C') {
    specificNote = 'Nhà C nằm ở dãy nhà bên phải hầm xe trung tâm (hướng từ cổng 2 đi vào), phía trên nhà G và bên trái nhà I.';
  } else if (building === 'D') {
    specificNote = 'Nhà D nằm bên phải nhà E, dưới nhà X và phía trên nhà F.';
  } else if (building === 'E') {
    specificNote = 'Nhà E nằm ở trung tâm khuôn viên, phía trên hầm xe trung tâm và bên trái nhà D. Hội trường E4 nằm tại tầng 4 nhà E.';
  } else if (building === 'F') {
    specificNote = 'Nhà F nằm ngay phía trên nhà C và nhà I, dưới cụm nhà D/T.';
  } else if (building === 'G') {
    specificNote = 'Nhà G nằm ở góc dưới bên phải khuôn viên, gần Cổng số 3.';
  } else if (building === 'H') {
    specificNote = 'Nhà H nằm giữa nhà A và nhà B, sát đường Nguyễn Thái Sơn.';
  } else if (building === 'I') {
    specificNote = 'Nhà I nằm bên phải nhà C, dưới nhà F và phía trên nhà G.';
  } else if (building === 'T') {
    specificNote = 'Nhà T là dãy nhà sát đường Lê Lợi, ở bên phải nhà D, gần cổng số 4.';
  } else if (building === 'V') {
    specificNote = 'Nhà V là tòa nhà cao tầng trung tâm, gần đường Nguyễn Văn Nghi, giữa nhà B và nhà X.';
  } else if (building === 'X') {
    specificNote = 'Nhà X nằm ở góc trên bên phải, sát đường Nguyễn Văn Nghi và gần đường Lê Lợi.';
  }

  return [
    `📍 Vị trí: ${building ? `Nhà ${building}` : 'Khuôn viên'} - ${action.campusName}`,
    `📌 Địa chỉ: ${action.address}`,
    room ? `🚪 Phòng: ${room}${floor ? ` (${floor})` : ''}` : '',
    specificNote ? `🧭 Hướng dẫn: ${specificNote}` : '🧭 Khuôn viên chính gồm các tòa nhà A, B, C, D, E, F, G, H, I, T, V, X.',
    `👉 Bạn hãy bấm nút "Xem sơ đồ khuôn viên" bên dưới để mở sơ đồ tương tác hoặc bấm "Chỉ đường Google Maps"!`,
  ].filter(Boolean).join('\n');
}

// ---------------------------------------------------------------------------
// External LLM Provider Request (with User Context)
// ---------------------------------------------------------------------------

async function fetchWithProviderRetry(url: string, init: RequestInit) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, init);
    if (response.ok || ![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) return response;
    await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
  }
  throw new Error('AI_PROVIDER_UNAVAILABLE');
}

async function requestProvider(messages: ChatMessage[], events: EventDocument[], ctx: UserActivityContext) {
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
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content: [
            'Bạn là trợ lý AI thông minh của ứng dụng IUH Event (Đại học Công nghiệp TP.HCM), trả lời tiếng Việt thân thiện, nhiệt tình và chính xác.',
            `Thông tin tài khoản sinh viên đang trò chuyện:`,
            `- Họ tên: ${ctx.user.name} (MSSV: ${ctx.user.studentId}, Chuyên ngành: ${ctx.user.major || 'Chưa cập nhật'})`,
            `- Xếp hạng điểm rèn luyện: Hạng #${ctx.rank} trên toàn trường (${ctx.drlPoints}/100 điểm, Huy hiệu: ${ctx.badge})`,
            `- Số sự kiện đã check-in: ${ctx.checkedInEvents.length} sự kiện (${ctx.checkedInEvents.map((e) => e.title).slice(0, 5).join('; ') || 'Chưa có'})`,
            `- Sự kiện đã đăng ký chờ tham gia: ${ctx.upcomingRegisteredEvents.length} sự kiện (${ctx.upcomingRegisteredEvents.map((e) => e.title).slice(0, 5).join('; ') || 'Chưa có'})`,
            `- Sự kiện đã lưu quan tâm: ${ctx.savedEvents.length} sự kiện (${ctx.savedEvents.map((e) => e.title).slice(0, 5).join('; ') || 'Chưa có'})`,
            `- Thể loại sự kiện ưa thích: ${ctx.preferredCategories.join(', ') || 'Chung'}`,
            'Hãy tận dụng thông tin tài khoản trên để trả lời trực tiếp, cá nhân hóa khi người dùng hỏi về bản thân họ (ví dụ: thứ hạng, điểm rèn luyện, sự kiện đã/chưa check-in, đổi mật khẩu, gợi ý sự kiện phù hợp).',
            'Nếu người dùng hỏi đổi mật khẩu: hướng dẫn vào tab Hồ sơ > Đổi mật khẩu, hoặc Quên mật khẩu tại màn hình Đăng nhập.',
            'Nếu người dùng hỏi về vé ngoại tuyến: hướng dẫn vào tab Hồ sơ > Vé sự kiện ngoại tuyến.',
            'Nếu hỏi về chứng nhận: hướng dẫn sau khi check-in xong vào chi tiết sự kiện để tải E-Certificate.',
            'Nếu người dùng hỏi ngoài phạm vi IUH Event (ví dụ: giải bài tập toán, thời tiết, tin tức bóng đá), hãy từ chối lịch sự và hướng dẫn quay lại chủ đề sự kiện trường.',
            'Xuống dòng rõ ràng, gạch đầu dòng dễ nhìn trên màn hình điện thoại di động.',
            `Danh sách sự kiện sắp diễn ra trong hệ thống: ${JSON.stringify(eventContext)}`,
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

// ---------------------------------------------------------------------------
// Main Router
// ---------------------------------------------------------------------------

export function createChatRouter(db: Db) {
  const router = Router();
  const events = db.collection<EventDocument>('events');

  router.post('/', requireAuth(db), async (req, res) => {
    const input = chatSchema.parse(req.body);
    const authUser = req.authUser!;

    const publishedEvents = await events.find({
      status: 'published',
    }).sort({ startsAt: 1 }).limit(500).toArray();
    const upcomingEvents = publishedEvents.filter((event) => event.startsAt.getTime() > Date.now());
    const latestUserMessage = input.messages.filter((message) => message.role === 'user').at(-1)?.content;
    if (!latestUserMessage) throw badRequest('MESSAGE_REQUIRED', 'Vui lòng nhập câu hỏi.');

    // 1. Fetch rich user context from database
    const userContext = await fetchUserActivityContext(db, authUser);

    // 2. Classify intent
    const namedEvent = findNamedEvent(latestUserMessage, publishedEvents);
    const isLeaderboard = isLeaderboardQuestion(latestUserMessage);
    const isCheckedInHistory = isCheckedInHistoryQuestion(latestUserMessage);
    const isMyRegistered = isMyRegisteredEventsQuestion(latestUserMessage);
    const isMySaved = isMySavedEventsQuestion(latestUserMessage);
    const isPersonalRecommendation = isPersonalizedRecommendationQuestion(latestUserMessage);
    const isPasswordAccount = isPasswordOrAccountQuestion(latestUserMessage);
    const isOfflineTicket = isOfflineTicketQuestion(latestUserMessage);
    const isCertificate = isCertificateQuestion(latestUserMessage);
    const campusMapAction = resolveIUHCampusLocation(latestUserMessage);
    const isCampusMap = Boolean(campusMapAction) || isCampusMapQuestion(latestUserMessage);
    const isSupport = isSupportQuestion(latestUserMessage);
    const isRegistration = isRegistrationQuestion(latestUserMessage);
    const isCheckIn = isCheckInQuestion(latestUserMessage);
    const isIncident = isIncidentQuestion(latestUserMessage);
    const isEventSearch = isEventSearchQuestion(latestUserMessage);
    const isUpcoming = isUpcomingEventsQuestion(latestUserMessage);
    const isDateSearch = isDateSearchQuestion(latestUserMessage);

    const isAppRelated = isEventRelated(latestUserMessage)
      || isLeaderboard
      || isCheckedInHistory
      || isMyRegistered
      || isMySaved
      || isPersonalRecommendation
      || isPasswordAccount
      || isOfflineTicket
      || isCertificate
      || isCampusMap
      || Boolean(namedEvent);

    // 3. Check for specific deterministic responses
    let reply = '';
    let matchedEvents: EventDocument[] = [];
    let mapAction: CampusMapAction | undefined = campusMapAction ?? undefined;
    let navigateTo: string | undefined = undefined;

    if (!isAppRelated) {
      reply = 'Mình là trợ lý của IUH Event nên chỉ hỗ trợ thông tin về sự kiện, lịch chương trình, đăng ký, check-in, điểm rèn luyện, địa điểm các cơ sở và tài khoản. Bạn có thể hỏi mình về các chủ đề này nhé!';
    } else if (isLeaderboard) {
      reply = buildLeaderboardReply(userContext);
      navigateTo = '/leaderboard';
    } else if (campusMapAction) {
      reply = buildCampusMapReply(campusMapAction, latestUserMessage);
      mapAction = campusMapAction;
    } else if (isCheckedInHistory) {
      const result = buildCheckedInHistoryReply(userContext);
      reply = result.text;
      matchedEvents = result.events;
    } else if (isMyRegistered) {
      const result = buildMyRegisteredEventsReply(userContext);
      reply = result.text;
      matchedEvents = result.events;
    } else if (isMySaved) {
      const result = buildMySavedEventsReply(userContext);
      reply = result.text;
      matchedEvents = result.events;
    } else if (isPersonalRecommendation) {
      const result = buildPersonalizedRecommendationReply(userContext, upcomingEvents);
      reply = result.text;
      matchedEvents = result.events;
    } else if (isPasswordAccount) {
      reply = buildPasswordOrAccountReply();
    } else if (isOfflineTicket) {
      reply = buildOfflineTicketReply();
    } else if (isCertificate) {
      reply = buildCertificateReply();
    } else if (isSupport) {
      reply = 'Bạn hãy liên hệ trực tiếp Phòng Tổ chức sự kiện tại trường IUH hoặc bàn lễ tân hội trường để được cán bộ hỗ trợ nhanh nhất nhé.';
    } else if (isIncident) {
      reply = 'Mình rất tiếc vì bạn đang gặp sự cố. Bạn vui lòng kiểm tra lại email hoặc vé trong mục Vé ngoại tuyến. Nếu vẫn chưa được giải quyết, hãy liên hệ trực tiếp Ban tổ chức sự kiện tại bàn hỗ trợ nhé.';
    } else if (isRegistration) {
      reply = 'Để đăng ký sự kiện:\n1. Chọn sự kiện ở mục Khám phá.\n2. Chọn “Đăng ký tham gia ngay”.\n3. Khi có thông báo, nghĩa là bạn đã đăng ký thành công và vé sẽ được cấp trong ví.';
    } else if (isCheckIn) {
      reply = 'Để check-in sự kiện:\n1. Mở sự kiện bạn đã đăng ký (hoặc mở Vé sự kiện ngoại tuyến).\n2. Nhấn “Check-in QR”.\n3. Cấp quyền camera nếu được yêu cầu.\n4. Quét mã QR tại khu vực tổ chức để được ghi nhận điểm danh!';
    } else if (isCampusMap && !namedEvent && !isEventSearch) {
      const fallbackMainAction: CampusMapAction = {
        campusId: 'main',
        campusName: 'Trụ sở chính IUH (Cơ sở 1 - Gò Vấp)',
        address: 'Số 12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP. Hồ Chí Minh',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=10.822159,106.687483',
        hasInternalMap: true,
      };
      reply = buildCampusMapReply(fallbackMainAction, latestUserMessage);
      mapAction = fallbackMainAction;
    } else {
      // General Event search / query -> Try LLM provider if configured
      let providerReply: string | null = null;
      if (process.env.AI_API_KEY?.trim()) {
        try {
          providerReply = await requestProvider(input.messages, upcomingEvents.slice(0, 20), userContext);
        } catch (error) {
          console.warn('[chat] AI provider request failed; using event fallback.', error);
        }
      }

      if (providerReply) {
        reply = providerReply;
      } else {
        // Fallback matching
        const matches = isUpcoming
          ? upcomingEvents.slice(0, 5)
          : namedEvent
            ? [namedEvent]
            : findMatchingEvents(latestUserMessage, publishedEvents);

        if (matches.length > 0) {
          reply = `Mình tìm thấy ${matches.length} sự kiện phù hợp. Bạn hãy xem các thẻ bên dưới để biết chi tiết hoặc đăng ký nhé!`;
          matchedEvents = matches;
        } else if (hasLocationConstraint(latestUserMessage)) {
          reply = 'Hiện chưa tìm thấy sự kiện nào tại địa điểm bạn vừa hỏi. Bạn hãy thử tên tòa nhà/phòng khác nhé.';
        } else {
          reply = 'Mình có thể giúp bạn tìm sự kiện theo chủ đề, địa điểm hoặc thời gian. Bạn hãy thử hỏi cụ thể hơn nhé!';
        }
      }

      // Also attach event cards for search / upcoming questions if not already attached
      if (matchedEvents.length === 0 && (isEventSearch || isUpcoming || isDateSearch || namedEvent)) {
        matchedEvents = isUpcoming
          ? upcomingEvents.slice(0, 5)
          : namedEvent
            ? [namedEvent]
            : findMatchingEvents(latestUserMessage, publishedEvents);
      }
    }

    res.json({
      data: {
        role: 'assistant',
        content: reply,
        source: 'ai',
        events: matchedEvents.map(toChatEvent),
        mapAction,
        navigateTo,
      },
    });
  });

  router.post('/resolve-campus', async (req, res, next) => {
    try {
      const input = resolveCampusSchema.parse(req.body);
      const combined = `${input.location} ${input.title || ''} ${input.description || ''}`;
      let resolved = resolveIUHCampusLocation(combined) ?? resolveIUHCampusLocation(input.location);

      if (!resolved) {
        resolved = {
          campusId: 'main',
          campusName: 'Trụ sở chính IUH (Cơ sở 1 - Gò Vấp)',
          address: 'Số 12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP. Hồ Chí Minh',
          googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=10.822159,106.687483',
          hasInternalMap: true,
        };
      }

      const shortNames = {
        main: 'Trụ sở chính (12 Nguyễn Văn Bảo)',
        cs2: 'Cơ sở 2 (20 Nguyễn Văn Dung)',
        quang_ngai: 'Phân hiệu Quảng Ngãi',
        thanh_hoa: 'Cơ sở Thanh Hóa',
      };

      const googleDirectionsUrls = {
        main: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Trường Đại học Công nghiệp TP.HCM, 12 Nguyễn Văn Bảo, Gò Vấp, TP. Hồ Chí Minh')}&dir_action=navigate`,
        cs2: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Trường Đại học Công nghiệp TP.HCM - Cơ sở 2, 20 Nguyễn Văn Dung, Gò Vấp, TP. Hồ Chí Minh')}&dir_action=navigate`,
        quang_ngai: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Đại học Công nghiệp TP.HCM Phân hiệu Quảng Ngãi, 938 Quang Trung, TP. Quảng Ngãi')}&dir_action=navigate`,
        thanh_hoa: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Đại học Công nghiệp TP.HCM Cơ sở Thanh Hóa, Xã Quảng Tâm, TP. Thanh Hóa')}&dir_action=navigate`,
      };

      const transportHints = {
        main: 'Tuyến buýt: 07, 148, 03. Cổng 1 nằm trên đường Nguyễn Văn Bảo, Cổng 2 và Cổng 3 thông ra các trục đường nội khu.',
        cs2: 'Cách trụ sở chính khoảng 3km, đi thẳng đường Nguyễn Oanh rồi rẽ vào Nguyễn Văn Dung.',
        quang_ngai: 'Trục đường chính Quang Trung ngay trung tâm TP. Quảng Ngãi, thuận tiện đón xe buýt và xe khách.',
        thanh_hoa: 'Trục đường Quốc lộ 47, gần đường tránh TP. Thanh Hóa, kết nối với trung tâm thành phố.',
      };

      let aiAnalysis = '';
      if (resolved.campusId === 'cs2') {
        aiAnalysis = `Địa điểm tại Cơ sở 2 (20 Nguyễn Văn Dung, Gò Vấp) - Khu liên hợp thể thao, sân bóng đá và trung tâm thực hành.`;
      } else if (resolved.campusId === 'quang_ngai') {
        aiAnalysis = `Địa điểm tại Phân hiệu Quảng Ngãi (938 Quang Trung) phục vụ sinh viên khu vực miền Trung - Tây Nguyên.`;
      } else if (resolved.campusId === 'thanh_hoa') {
        aiAnalysis = `Địa điểm tại Cơ sở Thanh Hóa phục vụ đào tạo và nghiên cứu khoa học khu vực miền Bắc.`;
      } else {
        const details = [
          resolved.buildingCode ? `Nhà ${resolved.buildingCode}` : '',
          resolved.room ? `Phòng ${resolved.room}` : '',
          resolved.floorHint ? `(${resolved.floorHint})` : '',
        ].filter(Boolean).join(' ');
        aiAnalysis = `Địa điểm tại Trụ sở chính IUH (12 Nguyễn Văn Bảo, Gò Vấp)${details ? ` · ${details}` : ''}.`;
      }

      res.json({
        data: {
          campusId: resolved.campusId,
          campusName: resolved.campusName,
          shortName: shortNames[resolved.campusId],
          address: resolved.address,
          buildingCode: resolved.buildingCode ?? null,
          room: resolved.room ?? null,
          floorHint: resolved.floorHint ?? null,
          googleMapsUrl: resolved.googleMapsUrl,
          googleDirectionsUrl: googleDirectionsUrls[resolved.campusId],
          hasInternalMap: resolved.hasInternalMap,
          aiAnalysis,
          transportHint: transportHints[resolved.campusId],
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
