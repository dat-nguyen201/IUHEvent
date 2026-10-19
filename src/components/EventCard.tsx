import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';

import { Badge } from '@/components/Badge';
import { colors, spacing } from '@/constants/app-theme';
import { useAppState } from '@/context/AppStateContext';
import type { StudentEvent } from '@/types/events';
import { formatEventDate } from '@/utils/date';

type EventCardProps = {
  event: StudentEvent;
  index?: number;
  scrollY?: SharedValue<number>;
  isLast?: boolean;
};

export function EventCard({ event, index = 0, scrollY, isLast = false }: EventCardProps) {
  const { isEventSaved, saveEvent, unsaveEvent } = useAppState();
  const saved = isEventSaved(event.id);

  // Chiều cao cố định của thẻ (420px) + khoảng cách gap (16px) = 436px
  const ITEM_SIZE = 436;

  const animatedStyle = useAnimatedStyle(() => {
    if (!scrollY || isLast) return {};

    // Vị trí chính xác tuyệt đối của thẻ nhờ chiều cao cố định
    const position = index * ITEM_SIZE;
    const scrollPast = scrollY.value - position;

    let translateY = scrollPast > 0 ? scrollPast : 0;
    const depth = scrollPast > 0 ? scrollPast / ITEM_SIZE : 0;
    const scale = Math.max(0.85, 1 - depth * 0.05);

    if (scrollPast > 0) {
      const scaleOffset = (ITEM_SIZE * (1 - scale)) / 2;
      translateY -= scaleOffset;
      translateY -= depth * 10;
    }

    return {
      transform: [{ translateY }, { scale }],
    };
  });

  // Lớp phủ đen mờ dần để tạo chiều sâu thay vì làm trong suốt cả thẻ
  const overlayStyle = useAnimatedStyle(() => {
    if (!scrollY || isLast) return { opacity: 0 };
    const position = index * ITEM_SIZE;
    const scrollPast = scrollY.value - position;
    const depth = scrollPast > 0 ? scrollPast / ITEM_SIZE : 0;
    return {
      opacity: Math.max(0, Math.min(0.7, depth * 0.4)),
    };
  });

  return (
    <Animated.View
      style={animatedStyle}
    >
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
      
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', borderRadius: 20 }, overlayStyle]} pointerEvents="none" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 420, // Cố định chiều cao để tính toán hiệu ứng xếp chồng chuẩn xác
    backgroundColor: '#111827', // Đổi thành màu solid để che hoàn toàn chữ của thẻ bên dưới
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
