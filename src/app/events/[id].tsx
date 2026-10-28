import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Screen } from '@/components/Screen';
import { StatusMessage } from '@/components/StatusMessage';
import { colors, spacing } from '@/constants/app-theme';
import { useAppState } from '@/context/AppStateContext';
import { getEventByIdSync } from '@/services/eventService';
import { formatEventDate } from '@/utils/date';

import { ReminderModal } from '@/components/ReminderModal';
import { useEventReminder } from '@/hooks/use-event-reminder';
import { useTheme } from '@tamagui/core';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useMemo(() => (id ? getEventByIdSync(id) : undefined), [id]);
  const { checkedInEventIds, isEventSaved, saveEvent, unsaveEvent } = useAppState();
  const theme = useTheme();

  const [reminderModalVisible, setReminderModalVisible] = useState(false);

  const {
    isScheduled: isReminderSet,
    scheduleReminder,
    removeReminder,
  } = useEventReminder(
    event?.id ?? '',
    event?.title ?? '',
    event?.location ?? '',
    event?.startsAt ?? '',
  );

  if (!event) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.color.val }]}>‹ Quay lại</Text>
        </Pressable>
        <StatusMessage
          title="Không tìm thấy sự kiện"
          message="Sự kiện này có thể đã bị xóa hoặc đường dẫn không đúng."
          actionLabel="Về danh sách"
          onAction={() => router.replace('/(tabs)')}
        />
      </Screen>
    );
  }

  const saved = isEventSaved(event.id);
  const checkedIn = checkedInEventIds.includes(event.id);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.color.val }]}>‹ Quay lại</Text>
        </Pressable>

        <Image source={event.image} style={styles.image} />

        <View style={styles.titleBlock}>
          <Badge label={event.category} tone="neutral" />
          <Text style={[styles.title, { color: theme.color.val }]}>{event.title}</Text>
          <Text style={[styles.description, { color: theme.muted.val }]}>{event.description}</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
          <Text style={[styles.infoLabel, { color: theme.muted.val }]}>Thời gian</Text>
          <Text style={[styles.infoValue, { color: theme.color.val }]}>{formatEventDate(event.startsAt)}</Text>
          <Text style={[styles.infoLabel, { color: theme.muted.val }]}>Địa điểm</Text>
          <Text style={[styles.infoValue, { color: theme.color.val }]}>{event.location}</Text>
          <Text style={[styles.infoLabel, { color: theme.muted.val }]}>Đơn vị tổ chức</Text>
          <Text style={[styles.infoValue, { color: theme.color.val }]}>{event.organizer}</Text>
        </View>

        <View style={styles.statusRow}>
          <Badge label={saved ? 'Đã lưu' : 'Chưa lưu'} tone={saved ? 'success' : 'neutral'} />
          <Badge label={checkedIn ? 'Đã check-in' : 'Chưa check-in'} tone={checkedIn ? 'success' : 'neutral'} />
          {isReminderSet && <Badge label="Đã bật nhắc nhở" tone="success" />}
        </View>

        {/* Member 4: QR Check-in Action */}
        <View style={styles.actionSection}>
          {checkedIn ? (
            <View style={styles.checkedInBanner}>
              <Text style={styles.checkedInIcon}>✅</Text>
              <View style={styles.checkedInTextCol}>
                <Text style={styles.checkedInTitle}>Bạn đã điểm danh sự kiện này</Text>
                <Text style={styles.checkedInSub}>Thông tin tham gia đã được ghi nhận vào lịch sử học tập.</Text>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push({ pathname: '/check-in', params: { eventId: event.id } })}
              style={[styles.qrCheckInButton, { backgroundColor: theme.primary.val }]}>
              <Text style={styles.qrButtonIcon}>📷</Text>
              <Text style={styles.qrButtonText}>Quét mã QR Check-in ngay</Text>
            </Pressable>
          )}

          {/* Member 4: Event Reminder Button */}
          <Pressable
            onPress={() => setReminderModalVisible(true)}
            style={[styles.reminderButton, { backgroundColor: theme.surface.val, borderColor: theme.border.val }, isReminderSet && { borderColor: theme.primary.val }]}>
            <Text style={styles.reminderButtonIcon}>{isReminderSet ? '⏰' : '🔔'}</Text>
            <Text style={[styles.reminderButtonText, isReminderSet && styles.reminderButtonTextActive]}>
              {isReminderSet ? 'Đã đặt nhắc nhở (Bấm để đổi / hủy)' : 'Nhắc tôi khi sắp diễn ra'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => (saved ? unsaveEvent(event.id) : saveEvent(event.id))}
            style={[styles.primaryButton, { backgroundColor: theme.primary.val }, saved && { backgroundColor: theme.surface.val, borderColor: theme.danger.val }]}>
            <Text style={[styles.primaryButtonText, saved && { color: theme.danger.val }]}>
              {saved ? 'Hủy lưu sự kiện' : 'Lưu vào lịch'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Reminder Options Modal */}
      <ReminderModal
        visible={reminderModalVisible}
        onClose={() => setReminderModalVisible(false)}
        isScheduled={isReminderSet}
        onSelectOption={(minutesBefore, isDemoNow) => {
          scheduleReminder(minutesBefore, isDemoNow);
        }}
        onCancelReminder={() => {
          removeReminder();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  backText: {
    color: colors.text,
    fontWeight: '800',
  },
  image: {
    backgroundColor: colors.border,
    borderRadius: 20,
    height: 220,
    width: '100%',
  },
  titleBlock: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  description: {
    color: colors.mutedText,
    fontSize: 16,
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  infoLabel: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.md,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: colors.danger,
  },
  actionSection: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  checkedInBanner: {
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#86EFAC',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  checkedInIcon: {
    fontSize: 24,
  },
  checkedInTextCol: {
    flex: 1,
    gap: 2,
  },
  checkedInTitle: {
    color: '#166534',
    fontSize: 15,
    fontWeight: '800',
  },
  checkedInSub: {
    color: '#15803D',
    fontSize: 12,
  },
  qrCheckInButton: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  qrButtonIcon: {
    fontSize: 18,
  },
  qrButtonText: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '900',
  },
  reminderButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  reminderButtonActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  reminderButtonIcon: {
    fontSize: 18,
  },
  reminderButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  reminderButtonTextActive: {
    color: '#16A34A',
  },
});
