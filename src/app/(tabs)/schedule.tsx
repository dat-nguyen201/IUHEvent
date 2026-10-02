import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Screen } from '@/components/Screen';
import { StatusMessage } from '@/components/StatusMessage';
import { colors, spacing } from '@/constants/app-theme';
import { useAppState } from '@/context/AppStateContext';
import { getEventByIdSync } from '@/services/eventService';
import type { StudentEvent } from '@/types/events';
import { formatEventDate, isFutureEvent } from '@/utils/date';

type ScheduleRow = { type: 'section'; title: string } | { type: 'event'; event: StudentEvent };

export default function ScheduleScreen() {
  const { savedEventIds, checkedInEventIds, unsaveEvent } = useAppState();

  const rows = useMemo<ScheduleRow[]>(() => {
    const savedEvents = savedEventIds
      .map((id) => getEventByIdSync(id))
      .filter((event): event is StudentEvent => Boolean(event))
      .sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());

    const upcoming = savedEvents.filter((event) => isFutureEvent(event.startsAt));
    const past = savedEvents.filter((event) => !isFutureEvent(event.startsAt));

    return [
      ...(upcoming.length > 0 ? [{ type: 'section' as const, title: 'Sắp diễn ra' }, ...upcoming.map((event) => ({ type: 'event' as const, event }))] : []),
      ...(past.length > 0 ? [{ type: 'section' as const, title: 'Đã qua' }, ...past.map((event) => ({ type: 'event' as const, event }))] : []),
    ];
  }, [savedEventIds]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Lịch của tôi</Text>
        <Text style={styles.subtitle}>Các sự kiện bạn đã lưu sẽ xuất hiện ở đây.</Text>
      </View>

      <FlatList
        style={styles.list}
        data={rows}
        keyExtractor={(item) => (item.type === 'section' ? item.title : item.event.id)}
        contentContainerStyle={rows.length === 0 ? styles.emptyList : styles.listContent}
        renderItem={({ item }) => {
          if (item.type === 'section') {
            return <Text style={styles.sectionTitle}>{item.title}</Text>;
          }

          const isCheckedIn = checkedInEventIds.includes(item.event.id);
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/events/[id]', params: { id: item.event.id } })}
              style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.eventTitle}>{item.event.title}</Text>
                  <Text style={styles.eventMeta}>{formatEventDate(item.event.startsAt)}</Text>
                </View>
                <Badge label="Đã lưu" tone="success" />
              </View>
              <Text style={styles.location}>{item.event.location}</Text>
              <View style={styles.cardFooter}>
                <Badge label={isCheckedIn ? 'Đã check-in' : 'Chưa check-in'} tone={isCheckedIn ? 'success' : 'neutral'} />
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    unsaveEvent(item.event.id);
                  }}
                  style={styles.removeButton}>
                  <Text style={styles.removeButtonText}>Hủy lưu</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <StatusMessage
            title="Bạn chưa lưu sự kiện nào"
            message="Vào tab Khám phá, chọn một sự kiện và bấm Lưu vào lịch để bắt đầu."
            actionLabel="Khám phá sự kiện"
            onAction={() => router.push('/(tabs)/discover')}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 15,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  cardTitleWrap: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  eventMeta: {
    color: colors.mutedText,
    fontSize: 13,
  },
  location: {
    color: colors.mutedText,
    fontSize: 14,
  },
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  removeButton: {
    borderColor: colors.danger,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  removeButtonText: {
    color: colors.danger,
    fontWeight: '800',
  },
});
