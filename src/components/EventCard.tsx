import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { colors, spacing } from '@/constants/app-theme';
import { useAppState } from '@/context/AppStateContext';
import type { StudentEvent } from '@/types/events';
import { formatEventDate } from '@/utils/date';

type EventCardProps = {
  event: StudentEvent;
};

export function EventCard({ event }: EventCardProps) {
  const { isEventSaved, saveEvent, unsaveEvent } = useAppState();
  const saved = isEventSaved(event.id);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
      style={styles.card}>
      <Image source={event.image} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Badge label={event.category} />
          {saved ? <Badge label="Đã lưu" tone="success" /> : null}
        </View>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.meta}>{formatEventDate(event.startsAt)}</Text>
        <Text style={styles.location}>{event.location}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {event.description}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.capacity}>
            {event.checkedInCount}/{event.capacity} check-in
          </Text>
          <Pressable
            onPress={(pressEvent) => {
              pressEvent.stopPropagation();
              if (saved) {
                unsaveEvent(event.id);
              } else {
                saveEvent(event.id);
              }
            }}
            style={[styles.saveButton, saved && styles.savedButton]}>
            <Text style={[styles.saveButtonText, saved && styles.savedButtonText]}>
              {saved ? 'Hủy lưu' : 'Lưu'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    backgroundColor: colors.border,
    height: 150,
    width: '100%',
  },
  content: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  meta: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  location: {
    color: colors.mutedText,
    fontSize: 14,
  },
  description: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  capacity: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  savedButton: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  savedButtonText: {
    color: colors.danger,
  },
});
