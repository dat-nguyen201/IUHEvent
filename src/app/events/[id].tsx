import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Screen } from '@/components/Screen';
import { StatusMessage } from '@/components/StatusMessage';
import { colors, spacing } from '@/constants/app-theme';
import { useAppState } from '@/context/AppStateContext';
import {
  cancelEventRegistration,
  getEventById,
  isEventRegistered,
  registerEvent,
} from '@/services/eventService';
import type { StudentEvent } from '@/types/events';
import { formatEventDate } from '@/utils/date';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const { checkedInEventIds, isEventSaved, saveEvent, unsaveEvent } = useAppState();
  const [event, setEvent] = useState<StudentEvent>();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState('');

  const loadEvent = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    setEvent(undefined);

    if (!eventId?.trim()) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await getEventById(eventId.trim());
      setEvent(result);
      setIsRegistered(result ? await isEventRegistered(result.id) : false);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/discover');
  };

  const handleRegistration = async () => {
    if (!event || isSubmitting) return;
    setIsSubmitting(true);
    setRegistrationMessage('');

    try {
      if (isRegistered) {
        await cancelEventRegistration(event.id);
        setIsRegistered(false);
        setRegistrationMessage('Bạn đã hủy đăng ký sự kiện.');
      } else {
        await registerEvent(event.id);
        setIsRegistered(true);
        setRegistrationMessage('Đăng ký sự kiện thành công!');
      }
    } catch {
      setRegistrationMessage('Chưa thể cập nhật đăng ký. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Đang tải chi tiết sự kiện...</Text>
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </Pressable>
        <StatusMessage
          title="Không tải được sự kiện"
          message="Đã có lỗi khi lấy thông tin sự kiện. Hãy thử tải lại."
          actionLabel="Thử lại"
          onAction={() => void loadEvent()}
        />
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </Pressable>
        <StatusMessage
          title="Không tìm thấy sự kiện"
          message="Sự kiện này không tồn tại hoặc đường dẫn không hợp lệ."
          actionLabel="Về danh sách"
          onAction={() => router.replace('/(tabs)/discover')}
        />
      </Screen>
    );
  }

  const saved = isEventSaved(event.id);
  const checkedIn = checkedInEventIds.includes(event.id);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ Quay lại</Text>
        </Pressable>

        <Image source={event.image} style={styles.image} />

        <View style={styles.titleBlock}>
          <Badge label={event.category} tone="neutral" />
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Thời gian</Text>
          <Text style={styles.infoValue}>{formatEventDate(event.startsAt)}</Text>
          <Text style={styles.infoLabel}>Địa điểm</Text>
          <Text style={styles.infoValue}>{event.location}</Text>
          <Text style={styles.infoLabel}>Đơn vị tổ chức</Text>
          <Text style={styles.infoValue}>{event.organizer}</Text>
          <Text style={styles.infoLabel}>Sức chứa</Text>
          <Text style={styles.infoValue}>{event.capacity} chỗ</Text>
          <Text style={styles.infoLabel}>Đã check-in</Text>
          <Text style={styles.infoValue}>{event.checkedInCount} người</Text>
        </View>

        <View style={styles.statusRow}>
          <Badge label={saved ? 'Đã lưu' : 'Chưa lưu'} tone={saved ? 'success' : 'neutral'} />
          <Badge label={checkedIn ? 'Đã check-in' : 'Chưa check-in'} tone={checkedIn ? 'success' : 'neutral'} />
          <Badge label={isRegistered ? 'Đã đăng ký' : 'Chưa đăng ký'} tone={isRegistered ? 'success' : 'neutral'} />
        </View>

        <Pressable
          disabled={isSubmitting}
          onPress={handleRegistration}
          style={[styles.primaryButton, isRegistered && styles.registrationCancelButton, isSubmitting && styles.disabledButton]}>
          {isSubmitting ? (
            <ActivityIndicator color={isRegistered ? colors.danger : '#FFFFFF'} />
          ) : (
            <Text style={[styles.primaryButtonText, isRegistered && styles.registrationCancelText]}>
              {isRegistered ? 'Hủy đăng ký' : 'Đăng ký tham gia'}
            </Text>
          )}
        </Pressable>
        {registrationMessage ? <Text accessibilityRole="alert" style={styles.feedback}>{registrationMessage}</Text> : null}

        <Pressable
          onPress={() => (saved ? unsaveEvent(event.id) : saveEvent(event.id))}
          style={[styles.primaryButton, styles.saveButton, saved && styles.saveCancelButton]}>
          <Text style={[styles.primaryButtonText, styles.saveButtonText, saved && styles.saveCancelText]}>
            {saved ? 'Hủy lưu sự kiện' : 'Lưu vào lịch'}
          </Text>
        </Pressable>
      </ScrollView>
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
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  registrationCancelButton: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1,
  },
  registrationCancelText: {
    color: colors.danger,
  },
  disabledButton: {
    opacity: 0.65,
  },
  feedback: {
    color: colors.mutedText,
    fontSize: 14,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  saveButtonText: {
    color: colors.primary,
  },
  saveCancelButton: {
    borderColor: colors.danger,
  },
  saveCancelText: {
    color: colors.danger,
  },
  state: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  stateText: {
    color: colors.mutedText,
  },
});
