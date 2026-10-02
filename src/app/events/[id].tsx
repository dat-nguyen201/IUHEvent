import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Screen } from '@/components/Screen';
import { StatusMessage } from '@/components/StatusMessage';
import { colors, spacing } from '@/constants/app-theme';
import { useAppState } from '@/context/AppStateContext';
import { getEventByIdSync } from '@/services/eventService';
import { formatEventDate } from '@/utils/date';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useMemo(() => (id ? getEventByIdSync(id) : undefined), [id]);
  const { checkedInEventIds, isEventSaved, saveEvent, unsaveEvent } = useAppState();

  if (!event) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Quay lại</Text>
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
        </View>

        <View style={styles.statusRow}>
          <Badge label={saved ? 'Đã lưu' : 'Chưa lưu'} tone={saved ? 'success' : 'neutral'} />
          <Badge label={checkedIn ? 'Đã check-in' : 'Chưa check-in'} tone={checkedIn ? 'success' : 'neutral'} />
        </View>

        <Pressable
          onPress={() => (saved ? unsaveEvent(event.id) : saveEvent(event.id))}
          style={[styles.primaryButton, saved && styles.secondaryButton]}>
          <Text style={[styles.primaryButtonText, saved && styles.secondaryButtonText]}>
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
});
