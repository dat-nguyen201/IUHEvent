import { Router } from 'express';
import { ObjectId, type Db } from 'mongodb';

import { notFound } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import type { NotificationDocument } from '../types/domain';

export function createNotificationsRouter(db: Db) {
  const router = Router();
  const notifications = db.collection<NotificationDocument>('notifications');

  router.use(requireAuth(db));

  // Auto seed initial notifications if user has none
  const ensureUserNotifications = async (userId: ObjectId) => {
    const count = await notifications.countDocuments({ userId });
    if (count > 0) return;

    const now = new Date();
    const seedItems: NotificationDocument[] = [
      {
        userId,
        title: 'Điểm danh thành công (+5 ĐRL)',
        body: 'Chúc mừng bạn! Bạn đã điểm danh thành công và được cộng 5 điểm rèn luyện vào hồ sơ cá nhân.',
        type: 'point',
        eventId: 'event-2',
        read: false,
        createdAt: new Date(now.getTime() - 25 * 60 * 1000), // 25 mins ago
      },
      {
        userId,
        title: 'Nhắc nhở sự kiện sắp bắt đầu',
        body: 'Sự kiện "Sinh hoạt CLB Tiếng Anh" chuẩn bị diễn ra tại Phòng C3.02. Bạn nhớ chuẩn bị mã QR nhé!',
        type: 'event',
        eventId: 'event-2',
        read: false,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        userId,
        title: 'Thông báo từ Ban Công tác Sinh viên (P.CTSV)',
        body: 'Cổng tổng hợp điểm rèn luyện học kỳ 1 năm học 2026-2027 đã mở. Sinh viên lưu ý tích cực tham gia các phong trào.',
        type: 'system',
        read: true,
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        userId,
        title: 'Sự kiện mới mở đăng ký',
        body: 'Khoa CNTT vừa công bố Workshop React Native & Mobile App Development. Nhanh tay đăng ký giữ chỗ!',
        type: 'event',
        eventId: 'event-1',
        read: true,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    ];

    await notifications.insertMany(seedItems);
  };

  router.get('/', async (req, res) => {
    const userId = req.authUser!._id;
    await ensureUserNotifications(userId);

    const list = await notifications
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    const unreadCount = list.filter((n) => !n.read).length;

    res.json({
      data: list.map((n) => ({
        id: n._id?.toHexString() || '',
        title: n.title,
        body: n.body,
        type: n.type,
        eventId: n.eventId,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    });
  });

  router.get('/unread-count', async (req, res) => {
    const userId = req.authUser!._id;
    await ensureUserNotifications(userId);

    const unreadCount = await notifications.countDocuments({
      userId,
      read: false,
    });

    res.json({ unreadCount });
  });

  router.patch('/:id/read', async (req, res) => {
    const userId = req.authUser!._id;
    const notifId = String(req.params.id);
    if (!ObjectId.isValid(notifId)) {
      throw notFound('NOTIFICATION_NOT_FOUND', 'Không tìm thấy thông báo.');
    }

    const result = await notifications.updateOne(
      { _id: new ObjectId(notifId), userId },
      { $set: { read: true } },
    );

    if (!result.matchedCount) {
      throw notFound('NOTIFICATION_NOT_FOUND', 'Không tìm thấy thông báo.');
    }

    const unreadCount = await notifications.countDocuments({ userId, read: false });
    res.json({ success: true, unreadCount });
  });

  router.post('/read-all', async (req, res) => {
    const userId = req.authUser!._id;
    await notifications.updateMany({ userId, read: false }, { $set: { read: true } });
    res.json({ success: true, unreadCount: 0 });
  });

  return router;
}
