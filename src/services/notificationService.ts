import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import { getStoredValue, removeStoredValue, setStoredValue } from '@/services/authStorage';
import { formatEventDate } from '@/utils/date';

const STORAGE_REMINDER_PREFIX = 'iuh_event_reminder_';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
    await Notifications.setNotificationChannelAsync('iuh-event-reminders', {
      name: 'Nhắc nhở sự kiện IUH',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1F4E79',
    });
    } catch (err) {
      console.warn('Cannot setup notification channel in current environment:', err);
    }
  }
}

export type PermissionResult = {
  granted: boolean;
  canAskAgain: boolean;
};

export async function checkNotificationPermission(): Promise<PermissionResult> {
  if (Platform.OS === 'web') {
    return { granted: false, canAskAgain: false };
  }

  try {
    const settings = await Notifications.getPermissionsAsync();
    return {
      granted: settings.granted || settings.ios?.status === IosAuthorizationStatus.PROVISIONAL,
      canAskAgain: settings.canAskAgain,
    };
  } catch (err) {
    console.warn('Error checking notification permission:', err);
    return { granted: false, canAskAgain: true };
  }
}

export async function requestNotificationPermission(): Promise<PermissionResult> {
  if (Platform.OS === 'web') {
    return { granted: false, canAskAgain: false };
  }

  try {
    const settings = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    try { await setupNotificationChannels(); } catch (e) { console.warn(e); }

    return {
      granted: settings.granted || settings.ios?.status === IosAuthorizationStatus.PROVISIONAL,
      canAskAgain: settings.canAskAgain,
    };
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return { granted: false, canAskAgain: false };
  }
}

export type ReminderOptions = {
  eventId: string;
  title: string;
  location: string;
  startsAt: string;
  minutesBefore?: number;
  isDemoNow?: boolean;
};

export type ScheduleReminderResult = {
  success: boolean;
  notificationId?: string;
  scheduledTime?: string;
  isDemo?: boolean;
  message?: string;
};

export async function scheduleEventReminder({
  eventId,
  title,
  location,
  startsAt,
  minutesBefore = 15,
  isDemoNow = false,
}: ReminderOptions): Promise<ScheduleReminderResult> {
  if (Platform.OS === 'web') {
    return {
      success: false,
      message: 'Thông báo cục bộ không được hỗ trợ trên nền tảng Web.',
    };
  }

  const perm = await requestNotificationPermission();
  if (!perm.granted) {
    return {
      success: false,
      message: 'Ứng dụng chưa được cấp quyền gửi thông báo. Vui lòng bật quyền trong Cài đặt thiết bị.',
    };
  }

  await cancelEventReminder(eventId);

  const eventTime = new Date(startsAt).getTime();
  const triggerMs = eventTime - minutesBefore * 60 * 1000;
  const now = Date.now();

  const isDemo = isDemoNow || triggerMs <= now;

  const trigger: Notifications.NotificationTriggerInput = isDemo
    ? {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
      }
    : {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(triggerMs),
      };

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `⏰ Nhắc nhở sự kiện: ${title}`,
      body: isDemo
        ? `[Thử nghiệm 5s] Sự kiện "${title}" sắp diễn ra tại ${location}. Đừng quên quét QR check-in nhé!`
        : `Sự kiện "${title}" sẽ diễn ra lúc ${formatEventDate(startsAt)} tại ${location}. Đừng quên tham gia nhé!`,
      data: {
        eventId,
        url: `studenteventapp://events/${eventId}`,
      },
    },
    trigger,
  });

  const reminderInfo = {
    notificationId,
    eventId,
    title,
    scheduledAt: isDemo ? new Date(now + 5000).toISOString() : new Date(triggerMs).toISOString(),
    isDemo,
  };

  await setStoredValue(`${STORAGE_REMINDER_PREFIX}${eventId}`, JSON.stringify(reminderInfo));

  return {
    success: true,
    notificationId,
    scheduledTime: reminderInfo.scheduledAt,
    isDemo,
    message: isDemo
      ? 'Đã đặt thông báo thử nghiệm! Thông báo sẽ xuất hiện sau 5 giây.'
      : `Đã đặt nhắc nhở trước ${minutesBefore} phút thành công!`,
  };
}

export async function cancelEventReminder(eventId: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  try {
    const raw = await getStoredValue(`${STORAGE_REMINDER_PREFIX}${eventId}`);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(data.notificationId);
      }
    }
  } catch (err) {
    console.warn('Error canceling notification:', err);
  } finally {
    await removeStoredValue(`${STORAGE_REMINDER_PREFIX}${eventId}`);
  }

  return true;
}

export async function isReminderScheduled(eventId: string): Promise<boolean> {
  try {
    const raw = await getStoredValue(`${STORAGE_REMINDER_PREFIX}${eventId}`);
    if (!raw) return false;

    if (Platform.OS === 'web') return true;

    const data = JSON.parse(raw);
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const exists = scheduledNotifications.some((n) => n.identifier === data.notificationId);

    if (!exists) {
      await removeStoredValue(`${STORAGE_REMINDER_PREFIX}${eventId}`);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function addNotificationResponseListener(onSelectEvent: (eventId: string) => void) {
  if (Platform.OS === 'web') {
    return () => {};
  }

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const eventId = response.notification.request.content.data?.eventId as string | undefined;
    if (eventId) {
      onSelectEvent(eventId);
    }
  });

  return () => {
    subscription.remove();
  };
}
