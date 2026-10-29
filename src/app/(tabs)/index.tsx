import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Badge } from "@/components/Badge";
import { Screen } from "@/components/Screen";
import { colors, spacing } from "@/constants/app-theme";
import { useAppState } from "@/context/AppStateContext";
import { eventCategories } from "@/data/events";
import { formatEventDate, isFutureEvent } from "@/utils/date";
import type { StudentEvent } from "@/types/events";
import { getEvents } from "@/services/eventService";
import { useTheme } from "@tamagui/core";

export default function HomeScreen() {
  const { user, savedEventIds, checkedInEventIds } = useAppState();
  const theme = useTheme();

  const [upcomingEvents, setUpcomingEvents] = useState<StudentEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      setIsLoading(true);
      try {
        const result = await getEvents({ page: 1, pageSize: 1000 });
        const futureEvents = result.items
          .filter((event) => isFutureEvent(event.startsAt))
          .sort(
            (a, b) =>
              new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
          );
        setUpcomingEvents(futureEvents);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadHomeData();
  }, []);

  const featured = upcomingEvents[0];

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary.val} />
          <Text style={{ marginTop: 10, color: theme.muted.val }}>
            Đang tải sự kiện...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.greeting}>
            <Text style={[styles.eyebrow, { color: theme.primary.val }]}>
              IUH EVENT
            </Text>
            <Text style={[styles.greetingTitle, { color: theme.color.val }]}>
              Chào {user?.name.split(" ").at(-1) ?? "bạn"}!
            </Text>
            <Text style={[styles.subtitle, { color: theme.muted.val }]}>
              Hôm nay bạn muốn tham gia điều gì?
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{user?.name.charAt(0) ?? "S"}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(tabs)/discover",
              params: { focusSearch: "1" },
            })
          }
          style={[
            styles.searchBox,
            {
              backgroundColor: theme.surface.val,
              borderColor: theme.border.val,
            },
          ]}
        >
          <Text style={styles.searchIcon}>⌕</Text>
          <Text style={[styles.searchPlaceholder, { color: theme.muted.val }]}>
            Tìm sự kiện, địa điểm...
          </Text>
          <Text style={styles.searchFilter}>☷</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/check-in")}
          style={[
            styles.quickQrBanner,
            {
              backgroundColor: theme.surface.val,
              borderColor: theme.border.val,
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.quickQrIconWrap}>
            <Text style={styles.quickQrIcon}>📷</Text>
          </View>
          <View style={styles.quickQrTextWrap}>
            <Text style={[styles.quickQrTitle, { color: theme.color.val }]}>
              Quét mã QR Check-in
            </Text>
            <Text style={[styles.quickQrSub, { color: theme.muted.val }]}>
              Điểm danh nhanh sự kiện bạn đang tham gia
            </Text>
          </View>
          <Text style={styles.quickQrChevron}>›</Text>
        </Pressable>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: theme.color.val }]}>
            Sự kiện sắp tới
          </Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(tabs)/discover",
                params: { focusSearch: "1" },
              })
            }
          >
            <Text style={[styles.link, { color: theme.primary.val }]}>
              Xem tất cả
            </Text>
          </Pressable>
        </View>
        {featured ? (
          <FeaturedEvent event={featured} />
        ) : (
          <View
            style={[styles.noEvent, { backgroundColor: theme.surface.val }]}
          >
            <Text style={[styles.noEventText, { color: theme.muted.val }]}>
              Chưa có sự kiện sắp tới.
            </Text>
          </View>
        )}

        <View
          style={[
            styles.statsRow,
            {
              backgroundColor: theme.surface.val,
              borderColor: theme.border.val,
            },
          ]}
        >
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(tabs)/schedule",
                params: { filter: "saved" },
              })
            }
            style={styles.statItem}
          >
            <Text style={[styles.statValue, { color: theme.color.val }]}>
              {savedEventIds.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.muted.val }]}>
              Đã lưu
            </Text>
          </Pressable>
          <View
            style={[styles.statDivider, { backgroundColor: theme.border.val }]}
          />
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(tabs)/schedule",
                params: { filter: "checkedIn" },
              })
            }
            style={styles.statItem}
          >
            <Text style={[styles.statValue, { color: theme.color.val }]}>
              {checkedInEventIds.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.muted.val }]}>
              Đã check-in
            </Text>
          </Pressable>
          <View
            style={[styles.statDivider, { backgroundColor: theme.border.val }]}
          />
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(tabs)/discover",
                params: { upcomingOnly: "1" },
              })
            }
            style={styles.statItem}
          >
            <Text style={[styles.statValue, { color: theme.color.val }]}>
              {upcomingEvents.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.muted.val }]}>
              Sắp diễn ra
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: theme.color.val }]}>
            Danh mục
          </Text>
          <Text style={[styles.sectionHint, { color: theme.muted.val }]}>
            Chọn chủ đề bạn thích
          </Text>
        </View>
        <View style={styles.categoryGrid}>
          {eventCategories.map((category, index) => (
            <CategoryTile
              key={category}
              category={category}
              index={index}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/discover",
                  params: { category, focusSearch: "1" },
                })
              }
            />
          ))}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: theme.color.val }]}>
            Có thể bạn quan tâm
          </Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(tabs)/discover",
                params: { focusSearch: "1" },
              })
            }
          >
            <Text style={[styles.link, { color: theme.primary.val }]}>
              Khám phá
            </Text>
          </Pressable>
        </View>
        {upcomingEvents.slice(1).map((event) => (
          <SmallEvent key={event.id} event={event} />
        ))}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </Screen>
  );
}

const categoryIcons = [
  "school-outline",
  "people-outline",
  "heart-outline",
  "musical-notes-outline",
] as const;
const categoryColors = [
  { background: "#E8F1FF", icon: "#3478F6" },
  { background: "#FFF0E6", icon: "#F07836" },
  { background: "#EAF8F1", icon: "#20A66A" },
  { background: "#F3ECFF", icon: "#8B5CF6" },
] as const;

function CategoryTile({
  category,
  index,
  onPress,
}: {
  category: string;
  index: number;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const palette = categoryColors[index % categoryColors.length];

  return (
    <Animated.View style={[styles.categoryTileWrap, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.set(withSpring(0.96, { damping: 14, stiffness: 280 }));
        }}
        onPressOut={() => {
          scale.set(withSpring(1, { damping: 14, stiffness: 280 }));
        }}
        style={[styles.categoryTile, { backgroundColor: palette.background }]}
      >
        <View
          style={[
            styles.categoryIconWrap,
            { backgroundColor: `${palette.icon}18` },
          ]}
        >
          <Ionicons
            color={palette.icon}
            name={categoryIcons[index % categoryIcons.length]}
            size={23}
          />
        </View>
        <Text style={styles.categoryLabel}>{category}</Text>
        <Ionicons color={palette.icon} name="arrow-forward-outline" size={15} />
      </Pressable>
    </Animated.View>
  );
}

function FeaturedEvent({ event }: { event: StudentEvent }) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/events/[id]", params: { id: event.id } })
      }
      style={styles.featuredWrap}
    >
      <ImageBackground
        source={event.image}
        resizeMode="cover"
        style={styles.featured}
        imageStyle={styles.featuredImage}
      >
        <View style={styles.featuredShade} />
        <View style={styles.featuredContent}>
          <Badge label={event.category} />
          <Text style={styles.featuredTitle} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={styles.featuredMeta}>
            {formatEventDate(event.startsAt)} · {event.location}
          </Text>
          <View style={styles.featuredAction}>
            <Text style={styles.featuredActionText}>Xem chi tiết ›</Text>
          </View>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

function SmallEvent({ event }: { event: StudentEvent }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/events/[id]", params: { id: event.id } })
      }
      style={styles.smallEvent}
    >
      <Image
        source={event.image}
        resizeMode="cover"
        style={styles.smallImage}
      />
      <View style={styles.smallCopy}>
        <Text style={[styles.smallCategory, { color: theme.primary.val }]}>
          {event.category}
        </Text>
        <Text
          style={[styles.smallTitle, { color: theme.color.val }]}
          numberOfLines={2}
        >
          {event.title}
        </Text>
        <Text style={[styles.smallMeta, { color: theme.muted.val }]}>
          {formatEventDate(event.startsAt)} · {event.location}
        </Text>
      </View>
      <Text style={[styles.chevron, { color: theme.muted.val }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  greeting: { flex: 1, gap: 3 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  greetingTitle: { color: colors.text, fontSize: 25, fontWeight: "900" },
  subtitle: { color: colors.mutedText, fontSize: 13 },
  avatar: {
    alignItems: "center",
    backgroundColor: "#FDE8D7",
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  avatarText: { color: "#9A4D19", fontSize: 19, fontWeight: "900" },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  searchIcon: { color: colors.primary, fontSize: 23, lineHeight: 26 },
  searchPlaceholder: { color: colors.mutedText, flex: 1, fontSize: 14 },
  searchFilter: { color: colors.mutedText, fontSize: 20 },
  sectionHeading: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  sectionHint: { color: colors.mutedText, fontSize: 12 },
  link: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  featuredWrap: { borderRadius: 18, overflow: "hidden" },
  featured: { justifyContent: "flex-end", minHeight: 220 },
  featuredImage: { borderRadius: 18 },
  featuredShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(17, 24, 39, 0.46)",
  },
  featuredContent: {
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
  },
  featuredTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27,
  },
  featuredMeta: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  featuredAction: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  featuredActionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  noEvent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
  },
  noEventText: { color: colors.mutedText, textAlign: "center" },
  statsRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: spacing.md,
  },
  statItem: { alignItems: "center", flex: 1, gap: 3 },
  statValue: { color: colors.text, fontSize: 19, fontWeight: "900" },
  statLabel: { color: colors.mutedText, fontSize: 11 },
  statDivider: { backgroundColor: colors.border, height: 32, width: 1 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  categoryTileWrap: { flexBasis: "47%", flexGrow: 1 },
  categoryTile: {
    alignItems: "center",
    borderRadius: 20,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 82,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  categoryIconWrap: {
    alignItems: "center",
    borderRadius: 15,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  categoryLabel: { color: "#172033", flex: 1, fontSize: 12, fontWeight: "900" },
  smallEvent: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  smallImage: {
    backgroundColor: colors.border,
    borderRadius: 10,
    height: 66,
    width: 66,
  },
  smallCopy: { flex: 1, gap: 3 },
  smallCategory: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  smallTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  smallMeta: { color: colors.mutedText, fontSize: 11 },
  chevron: { color: colors.mutedText, fontSize: 22 },
  bottomSpace: { height: spacing.xs },
  quickQrBanner: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 16,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  quickQrIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  quickQrIcon: {
    fontSize: 22,
  },
  quickQrTextWrap: {
    flex: 1,
    gap: 2,
  },
  quickQrTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  quickQrSub: {
    color: "#94A3B8",
    fontSize: 12,
  },
  quickQrChevron: {
    color: "#38BDF8",
    fontSize: 22,
    fontWeight: "800",
  },
});
