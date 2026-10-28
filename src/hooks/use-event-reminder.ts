import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import {
  cancelEventReminder,
  checkNotificationPermission,
  isReminderScheduled,
  requestNotificationPermission,
  scheduleEventReminder,
} from '@/services/notificationService';

export function useEventReminder(
  eventId: string,
  eventTitle: string,
  location: string,
  startsAt: string,
) {
  const [isScheduled, setIsScheduled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const scheduled = await isReminderScheduled(eventId);
      setIsScheduled(scheduled);
    } catch {
      setIsScheduled(false);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const scheduleReminder = useCallback(
    async (minutesBefore: number = 15, isDemoNow: boolean = false) => {
      setLoading(true);

      if (Platform.OS === 'web') {
        setLoading(false);
        Alert.alert(
          'Thông báo Web',
          'Tính năng thông báo thiết bị chỉ hỗ trợ trên ứng dụng Android/iOS thực tế hoặc máy ảo.',
        );
        return false;
      }

      const perm = await checkNotificationPermission();
      if (!perm.granted) {
        const req = await requestNotificationPermission();
        if (!req.granted) {
          setPermissionDenied(true);
          setLoading(false);
          Alert.alert(
            'Quyền thông báo bị từ chối',
            'Vui lòng cho phép quyền thông báo trong Cài đặt hệ thống để nhận lời nhắc trước sự kiện.',
            [{ text: 'Đã hiểu' }],
          );
          return false;
        }
      }

      setPermissionDenied(false);

      const result = await scheduleEventReminder({
        eventId,
        title: eventTitle,
        location,
        startsAt,
        minutesBefore,
        isDemoNow,
      });

      setLoading(false);

      if (result.success) {
        setIsScheduled(true);
        Alert.alert('Thành công', result.message ?? 'Đã lên lịch nhắc nhở sự kiện!');
        return true;
      } else {
        Alert.alert('Không thể đặt thông báo', result.message ?? 'Đã có lỗi xảy ra.');
        return false;
      }
    },
    [eventId, eventTitle, location, startsAt],
  );

  const removeReminder = useCallback(async () => {
    setLoading(true);
    await cancelEventReminder(eventId);
    setIsScheduled(false);
    setLoading(false);
    Alert.alert('Đã hủy nhắc nhở', 'Bạn sẽ không nhận được thông báo cho sự kiện này nữa.');
  }, [eventId]);

  return {
    isScheduled,
    loading,
    permissionDenied,
    scheduleReminder,
    removeReminder,
    refreshStatus: checkStatus,
  };
}
