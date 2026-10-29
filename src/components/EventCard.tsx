import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@tamagui/core";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { colors, spacing } from "@/constants/app-theme";
import { useAppState } from "@/context/AppStateContext";
import type { StudentEvent } from "@/types/events";

type EventCardProps = {
  event: StudentEvent;
  index?: number;
  scrollY?: SharedValue<number>;
  isLast?: boolean;
};

/** Chiều cao cố định của thẻ — dùng để tính hiệu ứng xếp chồng chính xác. */
export const EVENT_CARD_HEIGHT = 420;
export const EVENT_CARD_GAP = 16;
const ITEM_SIZE = EVENT_CARD_HEIGHT + EVENT_CARD_GAP;

const MONTHS = [
  "TH1",
  "TH2",
  "TH3",
  "TH4",
  "TH5",
  "TH6",
  "TH7",
  "TH8",
  "TH9",
  "TH10",
  "TH11",
  "TH12",
];
const WEEKDAYS = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Học thuật": "school",
  CLB: "people",
  "Tình nguyện": "heart",
  "Giải trí": "musical-notes",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function EventCard({
  event,
  index = 0,
  scrollY,
  isLast = false,
}: EventCardProps) {
  const theme = useTheme();
  const { isEventSaved, saveEvent, unsaveEvent } = useAppState();
  const saved = isEventSaved(event.id);

  const date = new Date(event.startsAt);
  const timeLabel = `${WEEKDAYS[date.getDay()]}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const fill =
    event.capacity > 0 ? Math.min(1, event.checkedInCount / event.capacity) : 0;
  const almostFull = fill >= 0.8;

  const pressScale = useSharedValue(1);
  const bookmarkScale = useSharedValue(1);

  // Hiệu ứng xếp chồng khi cuộn
  const stackStyle = useAnimatedStyle(() => {
    if (!scrollY || isLast) return { transform: [{ scale: pressScale.value }] };

    const scrollPast = scrollY.value - index * ITEM_SIZE;
    const depth = scrollPast > 0 ? scrollPast / ITEM_SIZE : 0;
    const scale = Math.max(0.85, 1 - depth * 0.05);
    let translateY = scrollPast > 0 ? scrollPast : 0;
    if (scrollPast > 0) {
      translateY -= (ITEM_SIZE * (1 - scale)) / 2 + depth * 10;
    }

    return { transform: [{ translateY }, { scale: scale * pressScale.value }] };
  });

  const overlayStyle = useAnimatedStyle(() => {
    if (!scrollY || isLast) return { opacity: 0 };
    const scrollPast = scrollY.value - index * ITEM_SIZE;
    const depth = scrollPast > 0 ? scrollPast / ITEM_SIZE : 0;
    return { opacity: Math.max(0, Math.min(0.7, depth * 0.4)) };
  });

  const bookmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));

  const toggleSave = () => {
    bookmarkScale.set(
      withSpring(1.35, { damping: 6, stiffness: 400 }, () => {
        bookmarkScale.set(withSpring(1));
      }),
    );

    if (!saved && new Date(event.startsAt).getTime() <= Date.now()) {
      Alert.alert(
        "Sự kiện đã kết thúc",
        "Sự kiện này đã kết thúc, bạn không thể lưu hoặc check-in nữa.",
      );
      return;
    }

    if (saved) unsaveEvent(event.id);
    else saveEvent(event.id);
  };

  return (
    <Animated.View style={[styles.wrapper, stackStyle]}>
      <Pressable
        onPress={() =>
          router.push({ pathname: "/events/[id]", params: { id: event.id } })
        }
        onPressIn={() => pressScale.set(withTiming(0.97, { duration: 120 }))}
        onPressOut={() => pressScale.set(withSpring(1, { damping: 12 }))}
        style={[
          styles.card,
          { backgroundColor: theme.surface.val, borderColor: theme.border.val },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Xem chi tiết ${event.title}`}
      >
        {/* Ảnh bìa */}
        <View style={styles.cover}>
          <Image source={event.image} style={styles.image} />
          <LinearGradient
            colors={["rgba(0,0,0,0.35)", "transparent", "rgba(17,24,39,0.95)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.dateBlock}>
            <Text style={styles.dateDay}>{pad(date.getDate())}</Text>
            <Text style={styles.dateMonth}>{MONTHS[date.getMonth()]}</Text>
          </View>

          <Animated.View style={[styles.bookmarkWrap, bookmarkStyle]}>
            <Pressable
              hitSlop={10}
              onPress={(e) => {
                e.stopPropagation();
                toggleSave();
              }}
              style={[styles.bookmark, saved && styles.bookmarkActive]}
              accessibilityLabel={saved ? "Hủy lưu sự kiện" : "Lưu sự kiện"}
            >
              <Ionicons
                name={saved ? "bookmark" : "bookmark-outline"}
                size={18}
                color="#FFFFFF"
              />
            </Pressable>
          </Animated.View>

          <View style={styles.categoryPill}>
            <Ionicons
              name={categoryIcons[event.category] ?? "pricetag"}
              size={12}
              color="#FFFFFF"
            />
            <Text style={styles.categoryText}>{event.category}</Text>
          </View>
        </View>

        {/* Nội dung */}
        <View style={styles.content}>
          <Text
            style={[styles.title, { color: theme.color.val }]}
            numberOfLines={2}
          >
            {event.title}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={15} color={theme.primary.val} />
            <Text
              style={[styles.metaStrong, { color: theme.color.val }]}
              numberOfLines={1}
            >
              {timeLabel}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons
              name="location-outline"
              size={15}
              color={theme.muted.val}
            />
            <Text
              style={[styles.meta, { color: theme.muted.val }]}
              numberOfLines={1}
            >
              {event.location}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons
              name="business-outline"
              size={15}
              color={theme.muted.val}
            />
            <Text
              style={[styles.meta, { color: theme.muted.val }]}
              numberOfLines={1}
            >
              {event.organizer}
            </Text>
          </View>

          <View style={styles.spacer} />

          <View style={styles.capacityRow}>
            <Text style={[styles.capacityText, { color: theme.muted.val }]}>
              <Text style={[styles.capacityStrong, { color: theme.color.val }]}>
                {event.checkedInCount}
              </Text>
              /{event.capacity} người tham gia
            </Text>
            {almostFull ? <Text style={styles.hot}>🔥 Sắp đầy</Text> : null}
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={
                almostFull ? ["#F97316", "#EF4444"] : ["#3B82F6", "#8B5CF6"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                { width: `${Math.max(4, fill * 100)}%` },
              ]}
            />
          </View>
        </View>
      </Pressable>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.dim, overlayStyle]}
      />
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  card: {
    height: EVENT_CARD_HEIGHT,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  cover: { height: 200, width: "100%" },
  image: { backgroundColor: colors.border, height: "100%", width: "100%" },
  dateBlock: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    left: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: "absolute",
    top: spacing.md,
  },
  dateDay: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  dateMonth: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bookmarkWrap: { position: "absolute", right: spacing.md, top: spacing.md },
  bookmark: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  bookmarkActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    borderWidth: 1,
    bottom: spacing.sm,
    flexDirection: "row",
    gap: 5,
    left: spacing.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: "absolute",
  },
  categoryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  content: {
    flex: 1,
    gap: 7,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 25,
    minHeight: 50,
  },
  metaRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  metaStrong: { color: colors.text, flex: 1, fontSize: 14, fontWeight: "700" },
  meta: { color: colors.mutedText, flex: 1, fontSize: 13.5 },
  spacer: { flex: 1 },
  capacityRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  capacityText: { color: colors.mutedText, fontSize: 12.5 },
  capacityStrong: { color: colors.text, fontWeight: "800" },
  hot: { color: "#FB923C", fontSize: 12, fontWeight: "800" },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 6,
    overflow: "hidden",
  },
  progressFill: { borderRadius: 999, height: "100%" },
  dim: { backgroundColor: "#000", borderRadius: 24 },
});
