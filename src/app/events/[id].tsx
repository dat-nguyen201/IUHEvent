import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '@tamagui/core';

import { ActionButton } from '@/components/ActionButton';
import { Badge } from '@/components/Badge';
import { HoldToCancelButton } from '@/components/HoldToCancelButton';
import { EventSummary } from '@/components/EventSummary';
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
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const theme = useTheme();
  const gestureX = useSharedValue(0);
  const swipeStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(Math.abs(gestureX.value) / 360, 0.35),
    transform: [{ translateX: gestureX.value }],
  }));
  const swipeBack = Gesture.Pan()
    .activeOffsetX(24)
    .failOffsetY([-18, 18])
    .maxPointers(1)
    .onUpdate((gesture) => {
      gestureX.set(Math.max(0, gesture.translationX));
    })
    .onEnd(() => {
      if (gestureX.value > 120) {
        runOnJS(router.back)();
      } else {
        gestureX.set(withSpring(0));
      }
    });
  const detailGestures = Gesture.Simultaneous(swipeBack, Gesture.Native());

  useEffect(() => {
    if (!cancelSuccess) return;
    const timer = setTimeout(() => setCancelSuccess(false), 1100);
    return () => clearTimeout(timer);
  }, [cancelSuccess]);

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
  const showCancelButton = saved || cancelSuccess;

  return (
    <Screen>
      <GestureDetector gesture={detailGestures}>
        <Animated.View style={[swipeStyle, styles.detailContainer]}>
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
            contentContainerStyle={styles.content}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={[styles.backText, { color: theme.color.val }]}>‹ Quay lại</Text>
            </Pressable>

            <Image source={event.image} style={[styles.image, { backgroundColor: theme.border.val }]} />

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

            <EventSummary event={event} />

            <View style={styles.statusRow}>
              <Badge label={saved ? 'Đã lưu' : 'Chưa lưu'} tone={saved ? 'success' : 'neutral'} />
              <Badge label={checkedIn ? 'Đã check-in' : 'Chưa check-in'} tone={checkedIn ? 'success' : 'neutral'} />
            </View>

            {showCancelButton ? (
              <HoldToCancelButton
                disabled={cancelSuccess}
                onConfirm={() => {
                  unsaveEvent(event.id);
                  setCancelSuccess(true);
                }}
              />
            ) : (
              <ActionButton
                label="Lưu vào lịch"
                variant="primary"
                onPress={() => saveEvent(event.id)}
              />
            )}
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  detailContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
});
