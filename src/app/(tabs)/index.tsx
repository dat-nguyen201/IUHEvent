import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Badge } from "@/components/Badge";
import { Screen } from "@/components/Screen";
import { StatusMessage } from "@/components/StatusMessage";
import { colors, spacing } from "@/constants/app-theme";
import { useAppState } from "@/context/AppStateContext";
import { eventCategories } from "@/data/events";
import { organizers, getOrganizerLogo, type Organizer } from "@/data/organizers";
import { getAllOrganizers } from "@/services/organizerService";
import { formatEventDate, isFutureEvent } from "@/utils/date";
import type { StudentEvent } from "@/types/events";
import { getEvents } from "@/services/eventService";
import { appMode } from "@/constants/app-mode";
import { invalidateEventsCache } from "@/services/eventsApi";
import { ApiError } from "@/services/apiClient";
import { useTheme } from "@tamagui/core";
import { useAppTheme } from "@/context/ThemeContext";
import { getAvatarUri } from "@/services/avatarStorage";
import { fetchUnreadNotificationCount } from "@/services/notificationService";
import { fetchLeaderboard, type LeaderboardStudent } from "@/services/leaderboardService";

export interface RecommendedEvent extends StudentEvent {
  recommendationReason: string;
  recommendationIcon: keyof typeof Ionicons.glyphMap;
  recommendationColor: string;
  fillPercentage: number;
  _score?: number;
}

export default function HomeScreen() {
  const {
    user,
    savedEventIds,
    checkedInEventIds,
    registeredEventIds,
    saveEvent,
    unsaveEvent,
  } = useAppState();
  const theme = useTheme();

  const [upcomingEvents, setUpcomingEvents] = useState<StudentEvent[]>([]);
  const [allEvents, setAllEvents] = useState<StudentEvent[]>([]);
  const [organizerList, setOrganizerList] = useState<Organizer[]>(organizers);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        setAvatarUri(null);
        return undefined;
      }

      void getAvatarUri(user.id).then(setAvatarUri);
      return undefined;
    }, [user]),
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topStudents, setTopStudents] = useState<LeaderboardStudent[]>([]);

  const loadHomeData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      if (appMode === "remote") invalidateEventsCache();
      void getAllOrganizers().then(setOrganizerList);
      void fetchLeaderboard().then(res => setTopStudents(res.topStudents.slice(0, 3)));
      const result = await getEvents({ page: 1, pageSize: 100 });
      setAllEvents(result.items);
      const futureEvents = result.items
        .filter((event) => isFutureEvent(event.startsAt))
        .sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        );
      setUpcomingEvents(futureEvents);
    } catch (e) {
      console.error(e);
      setError(
        e instanceof ApiError
          ? e.message
          : "Không thể kết nối máy chủ. Hãy kiểm tra kết nối mạng và thử lại.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHomeData();
      void fetchUnreadNotificationCount().then(setUnreadNotifCount);
    }, [loadHomeData]),
  );

  const realOrganizerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ev of allEvents) {
      if (!ev.organizer) continue;
      const key = ev.organizer.trim().toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [allEvents]);

  const getRealOrganizerCount = useCallback(
    (org: Organizer) => {
      const normName = org.name.toLowerCase().trim();
      const normShort = org.shortName.toLowerCase().trim();
      let total = 0;
      for (const [key, count] of Object.entries(realOrganizerCounts)) {
        if (
          key === normName ||
          key === normShort ||
          key.includes(normShort) ||
          normName.includes(key)
        ) {
          total += count;
        }
      }
      return total;
    },
    [realOrganizerCounts],
  );

  const featuredEvents = upcomingEvents.slice(0, 5);

  const recommendedEvents: RecommendedEvent[] = useMemo(() => {
    if (upcomingEvents.length === 0) return [];

    const categoryScores: Record<string, number> = {};
    const organizerScores: Record<string, number> = {};

    const interactedIds = new Set([
      ...savedEventIds,
      ...checkedInEventIds,
      ...(registeredEventIds || []),
    ]);

    for (const ev of upcomingEvents) {
      if (interactedIds.has(ev.id)) {
        categoryScores[ev.category] = (categoryScores[ev.category] || 0) + 2;
        if (ev.organizer) {
          organizerScores[ev.organizer] =
            (organizerScores[ev.organizer] || 0) + 2;
        }
      }
    }

    const topCategory = Object.entries(categoryScores).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];
    const topOrganizer = Object.entries(organizerScores).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    const scored: RecommendedEvent[] = upcomingEvents.map((event) => {
      let score = 0;
      let reason = "Dành riêng cho bạn";
      let icon: keyof typeof Ionicons.glyphMap = "sparkles";
      let color = "#8B5CF6";

      const fillPercent =
        event.capacity > 0
          ? Math.min(
              100,
              Math.round(((event.checkedInCount || 0) / event.capacity) * 100)
            )
          : 0;

      if (topCategory && event.category === topCategory) {
        score += 35;
        reason = "Chủ đề bạn quan tâm";
        icon = "heart";
        color = "#E11D48";
      } else if (topOrganizer && event.organizer === topOrganizer) {
        score += 30;
        reason = "Từ đơn vị bạn theo dõi";
        icon = "business";
        color = "#0D6EFD";
      } else if (
        event.organizer?.toLowerCase().includes("công nghệ thông tin")
      ) {
        score += 25;
        reason = "Gợi ý sinh viên CNTT";
        icon = "code-slash";
        color = "#2563EB";
      } else if (fillPercent >= 70) {
        score += 20;
        reason = "Sắp kín chỗ · Đăng ký ngay";
        icon = "flame";
        color = "#DC2626";
      } else if (event.category === "Học thuật") {
        score += 15;
        reason = "Nâng cao kỹ năng chuyên ngành";
        icon = "school";
        color = "#059669";
      } else {
        score += 10;
        reason = "Sự kiện nổi bật trong tuần";
        icon = "trending-up";
        color = "#D97706";
      }

      if (savedEventIds.includes(event.id)) {
        score += 15;
      }

      return {
        ...event,
        recommendationReason: reason,
        recommendationIcon: icon,
        recommendationColor: color,
        fillPercentage: fillPercent,
        _score: score,
      };
    });

    scored.sort((a, b) => (b._score || 0) - (a._score || 0));
    return scored;
  }, [upcomingEvents, savedEventIds, checkedInEventIds, registeredEventIds]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ev of upcomingEvents) {
      counts[ev.category] = (counts[ev.category] || 0) + 1;
    }
    return counts;
  }, [upcomingEvents]);

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

  if (error && upcomingEvents.length === 0) {
    return (
      <Screen>
        <StatusMessage
          title="Không thể tải sự kiện"
          message={error}
          actionLabel="Thử lại"
          onAction={() => loadHomeData()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadHomeData(true)}
            colors={[theme.primary.val]}
            tintColor={theme.primary.val}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerBrandRow}>
            <View style={styles.headerLogoWrap}>
              <Image
                source={require("@/IMG/logo.png")}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.greeting}>
              <Text style={[styles.eyebrow, { color: theme.primary.val }]}>
                IUH EVENT · ĐH CÔNG NGHIỆP TP.HCM
              </Text>
              <Text style={[styles.greetingTitle, { color: theme.color.val }]}>
                Chào {user?.name.split(" ").at(-1) ?? "bạn"}!
              </Text>
              <Text style={[styles.subtitle, { color: theme.muted.val }]}>
                Hôm nay bạn muốn tham gia điều gì?
              </Text>
            </View>
          </View>
          <View style={styles.headerRightRow}>
            <Pressable
              onPress={() => router.push("/notifications" as any)}
              style={[
                styles.headerIconBtn,
                {
                  backgroundColor: theme.surface.val,
                  borderColor: theme.border.val,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Thông báo"
            >
              <Ionicons name="notifications-outline" size={20} color={theme.color.val} />
              {unreadNotifCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push("/(tabs)/profile")}
              style={styles.avatar}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{user?.name.charAt(0) ?? "S"}</Text>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.searchRow}>
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
            accessibilityRole="search"
            accessibilityLabel="Tìm sự kiện, địa điểm"
          >
            <Ionicons name="search" size={19} color={theme.primary.val} />
            <Text style={[styles.searchPlaceholder, { color: theme.muted.val }]}>
              Tìm sự kiện, địa điểm...
            </Text>
            <Ionicons name="options-outline" size={18} color={theme.muted.val} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/check-in")}
            style={[
              styles.qrScanBtn,
              {
                backgroundColor: theme.primary.val,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Quét mã QR Check-in"
          >
            <Ionicons name="qr-code-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

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
        {featuredEvents.length > 0 ? (
          <UpcomingEventsCarousel events={featuredEvents} />
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
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.color.val }]}>
              Danh mục sự kiện
            </Text>
            <Text style={[styles.sectionHint, { color: theme.muted.val }]}>
              Khám phá theo lĩnh vực bạn quan tâm
            </Text>
          </View>
        </View>
        <View style={styles.categoryGrid}>
          {eventCategories.map((category) => (
            <BentoCategoryCard
              key={category}
              category={category}
              eventCount={categoryCounts[category] || 0}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/discover",
                  params: { category, focusSearch: "1" },
                })
              }
            />
          ))}
        </View>

        {/* Đơn vị tổ chức tiêu biểu */}
        <View style={styles.sectionHeading}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.color.val }]}>
              Đơn vị tổ chức
            </Text>
            <Text style={[styles.sectionHint, { color: theme.muted.val }]}>
              Khoa viện, đoàn thể và CLB năng động tại IUH
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/organizers" as any)}
          >
            <Text style={[styles.link, { color: theme.primary.val }]}>
              Xem tất cả
            </Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.organizerScroll}
        >
          {organizerList.map((org) => (
            <OrganizerBubble
              key={org.id}
              organizer={org}
              realCount={getRealOrganizerCount(org)}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/discover",
                  params: { organizer: org.name },
                })
              }
            />
          ))}
        </ScrollView>

        {/* Có thể bạn quan tâm (Smart Recommendations + Magazine Cards) */}
        <View style={styles.sectionHeading}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.color.val }]}>
              Có thể bạn quan tâm
            </Text>
            <Text style={[styles.sectionHint, { color: theme.muted.val }]}>
              Gợi ý dựa trên ngành học & hoạt động bạn đã lưu
            </Text>
          </View>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(tabs)/discover",
                params: { focusSearch: "1" },
              })
            }
          >
            <Text style={[styles.link, { color: theme.primary.val }]}>
              Tất cả ({recommendedEvents.length})
            </Text>
          </Pressable>
        </View>

        {recommendedEvents.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.magazineScroll}
            snapToInterval={312}
            decelerationRate="fast"
          >
            {recommendedEvents.map((event) => (
              <MagazineEventCard
                key={event.id}
                event={event}
                isSaved={savedEventIds.includes(event.id)}
                onToggleSave={() => {
                  if (savedEventIds.includes(event.id)) {
                    void unsaveEvent(event.id);
                  } else {
                    void saveEvent(event.id);
                  }
                }}
              />
            ))}
          </ScrollView>
        ) : (
          <View
            style={[styles.noEvent, { backgroundColor: theme.surface.val }]}
          >
            <Text style={[styles.noEventText, { color: theme.muted.val }]}>
              Chưa có sự kiện đề xuất cho bạn.
            </Text>
          </View>
        )}

        {/* Vinh danh Top 3 Sinh viên Xuất sắc (Leaderboard Spotlight) */}
        <View style={styles.sectionHeading}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 18 }}>🏆</Text>
              <Text style={[styles.sectionTitle, { color: theme.color.val }]}>
                Vinh danh Rèn luyện
              </Text>
              <View style={styles.liveTagPill}>
                <Text style={styles.liveTagText}>LIVE</Text>
              </View>
            </View>
            <Text style={[styles.sectionHint, { color: theme.muted.val }]}>
              Top 3 sinh viên dẫn đầu phong trào tích lũy ĐRL
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/leaderboard" as any)}
            hitSlop={8}
          >
            <Text style={[styles.link, { color: theme.primary.val }]}>
              Xem tất cả →
            </Text>
          </Pressable>
        </View>

        {/* Podium Top 3 Spotlight Widget */}
        <Pressable
          onPress={() => router.push("/leaderboard" as any)}
          style={[
            styles.podiumWidgetContainer,
            { backgroundColor: theme.surface.val, borderColor: theme.border.val },
          ]}
        >
          <LinearGradient
            colors={["#0F2557", "#1E3A8A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.podiumWidgetGradient}
          >
            <View style={styles.podiumWidgetRow}>
              {/* Rank 2 - Silver */}
              <View style={[styles.podiumSpotCol, styles.spotRank2]}>
                <Text style={styles.spotMedalIcon}>🥈</Text>
                <View style={[styles.spotAvatarCircle, { borderColor: "#E2E8F0" }]}>
                  <Text style={styles.spotAvatarText}>
                    {topStudents[1]?.name
                      ? topStudents[1].name.charAt(topStudents[1].name.lastIndexOf(" ") + 1) || topStudents[1].name.charAt(0)
                      : "2"}
                  </Text>
                </View>
                <Text style={styles.spotStudentName} numberOfLines={1}>
                  {topStudents[1]?.name || "Đang cập nhật"}
                </Text>
                <Text style={styles.spotStudentMajor} numberOfLines={1}>
                  {topStudents[1]?.major || "Khoa"}
                </Text>
                <View style={styles.spotScorePill}>
                  <Text style={styles.spotScoreText}>
                    {topStudents[1]?.drlPoints ?? 95}đ ĐRL
                  </Text>
                </View>
                <View style={[styles.spotStandBlock, styles.standBlock2]}>
                  <Text style={styles.standBlockNum}>2</Text>
                </View>
              </View>

              {/* Rank 1 - Gold (Highest in Center) */}
              <View style={[styles.podiumSpotCol, styles.spotRank1]}>
                <Text style={[styles.spotMedalIcon, { fontSize: 26 }]}>👑</Text>
                <View style={[styles.spotAvatarCircle, styles.spotAvatarRank1]}>
                  <Text style={[styles.spotAvatarText, { fontSize: 20 }]}>
                    {topStudents[0]?.name
                      ? topStudents[0].name.charAt(topStudents[0].name.lastIndexOf(" ") + 1) || topStudents[0].name.charAt(0)
                      : "1"}
                  </Text>
                </View>
                <Text style={[styles.spotStudentName, { fontWeight: "900", fontSize: 13 }]} numberOfLines={1}>
                  {topStudents[0]?.name || "Đang cập nhật"}
                </Text>
                <Text style={styles.spotStudentMajor} numberOfLines={1}>
                  {topStudents[0]?.major || "Khoa"}
                </Text>
                <View style={[styles.spotScorePill, { backgroundColor: "#F59E0B" }]}>
                  <Text style={[styles.spotScoreText, { color: "#FFFFFF" }]}>
                    {topStudents[0]?.drlPoints ?? 100}đ ĐRL
                  </Text>
                </View>
                <View style={[styles.spotStandBlock, styles.standBlock1]}>
                  <Text style={[styles.standBlockNum, { fontSize: 18 }]}>1</Text>
                </View>
              </View>

              {/* Rank 3 - Bronze */}
              <View style={[styles.podiumSpotCol, styles.spotRank3]}>
                <Text style={styles.spotMedalIcon}>🥉</Text>
                <View style={[styles.spotAvatarCircle, { borderColor: "#EA580C" }]}>
                  <Text style={styles.spotAvatarText}>
                    {topStudents[2]?.name
                      ? topStudents[2].name.charAt(topStudents[2].name.lastIndexOf(" ") + 1) || topStudents[2].name.charAt(0)
                      : "3"}
                  </Text>
                </View>
                <Text style={styles.spotStudentName} numberOfLines={1}>
                  {topStudents[2]?.name || "Đang cập nhật"}
                </Text>
                <Text style={styles.spotStudentMajor} numberOfLines={1}>
                  {topStudents[2]?.major || "Khoa"}
                </Text>
                <View style={styles.spotScorePill}>
                  <Text style={styles.spotScoreText}>
                    {topStudents[2]?.drlPoints ?? 90}đ ĐRL
                  </Text>
                </View>
                <View style={[styles.spotStandBlock, styles.standBlock3]}>
                  <Text style={styles.standBlockNum}>3</Text>
                </View>
              </View>
            </View>

            {/* Tap to View Full Leaderboard Prompt */}
            <View style={styles.spotFooterPrompt}>
              <Text style={styles.spotFooterPromptText}>
                Xem đầy đủ Top 30 & Điểm thi đua các Khoa IUH
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#93C5FD" />
            </View>
          </LinearGradient>
        </Pressable>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </Screen>
  );
}

const CATEGORY_CONFIG: Record<
  string,
  {
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    lightGradients: [string, string];
    darkGradients: [string, string];
    accent: string;
    tag: string;
  }
> = {
  "Học thuật": {
    subtitle: "Workshop & Nghiên cứu",
    icon: "school",
    lightGradients: ["#EFF6FF", "#DBEAFE"],
    darkGradients: ["#172554", "#1E3A8A"],
    accent: "#2563EB",
    tag: "Kỹ năng",
  },
  CLB: {
    subtitle: "Giao lưu & Tuyển quân",
    icon: "people",
    lightGradients: ["#FFF7ED", "#FFEDD5"],
    darkGradients: ["#431407", "#7C2D12"],
    accent: "#EA580C",
    tag: "Đồng đội",
  },
  "Tình nguyện": {
    subtitle: "Điểm rèn luyện & Xã hội",
    icon: "heart",
    lightGradients: ["#ECFDF5", "#D1FAE5"],
    darkGradients: ["#064E3B", "#065F46"],
    accent: "#059669",
    tag: "Ý nghĩa",
  },
  "Giải trí": {
    subtitle: "Âm nhạc & Thể thao",
    icon: "musical-notes",
    lightGradients: ["#FAF5FF", "#F3E8FF"],
    darkGradients: ["#3B0764", "#581C87"],
    accent: "#9333EA",
    tag: "Sôi động",
  },
};

function BentoCategoryCard({
  category,
  eventCount,
  onPress,
}: {
  category: string;
  eventCount: number;
  onPress: () => void;
}) {
  const { colorScheme } = useAppTheme();
  const isDark = colorScheme === "dark";
  const config = CATEGORY_CONFIG[category] || {
    subtitle: "Hoạt động sinh viên",
    icon: "apps" as const,
    lightGradients: ["#F1F5F9", "#E2E8F0"] as [string, string],
    darkGradients: ["#1E293B", "#0F172A"] as [string, string],
    accent: "#0D6EFD",
    tag: "Khám phá",
  };

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const gradients = isDark ? config.darkGradients : config.lightGradients;

  return (
    <Animated.View style={[styles.bentoCardWrap, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.set(withSpring(0.95, { damping: 14, stiffness: 280 }));
        }}
        onPressOut={() => {
          scale.set(withSpring(1, { damping: 14, stiffness: 280 }));
        }}
        style={[
          styles.bentoCard,
          { borderColor: `${config.accent}35` },
        ]}
      >
        <LinearGradient
          colors={gradients}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Decorative Watermark Icon in background */}
        <View style={styles.bentoWatermarkWrap} pointerEvents="none">
          <Ionicons
            name={config.icon}
            size={76}
            color={config.accent}
            style={styles.bentoWatermark}
          />
        </View>

        {/* Top row: Icon bubble + Event count chip */}
        <View style={styles.bentoTopRow}>
          <View
            style={[
              styles.bentoIconBubble,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
                shadowColor: config.accent,
              },
            ]}
          >
            <Ionicons name={config.icon} size={20} color={config.accent} />
          </View>
          <View
            style={[
              styles.bentoCountChip,
              { backgroundColor: `${config.accent}18` },
            ]}
          >
            <Text style={[styles.bentoCountText, { color: config.accent }]}>
              {eventCount > 0 ? `${eventCount} sự kiện` : config.tag}
            </Text>
          </View>
        </View>

        {/* Bottom row: Category Name & Subtitle & Mini Action Arrow */}
        <View style={styles.bentoBottomContent}>
          <View style={styles.bentoTextWrap}>
            <Text
              style={[
                styles.bentoTitle,
                { color: isDark ? "#FFFFFF" : "#0F172A" },
              ]}
            >
              {category}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.bentoSubtitle,
                { color: isDark ? "rgba(255,255,255,0.65)" : "#64748B" },
              ]}
            >
              {config.subtitle}
            </Text>
          </View>
          <View
            style={[
              styles.bentoArrowWrap,
              { backgroundColor: `${config.accent}15` },
            ]}
          >
            <Ionicons name="arrow-forward" size={13} color={config.accent} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

interface CarouselItem extends StudentEvent {
  _uniqueKey: string;
  _realIndex: number;
}

function UpcomingEventsCarousel({ events }: { events: StudentEvent[] }) {
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const isInteracting = useRef(false);
  const virtualIndexRef = useRef(1);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tạo danh sách mở rộng có clone ở 2 đầu để tạo vòng lặp vô tận mượt mà:
  // [E_last, E_0, E_1, ..., E_last, E_0]
  const extendedEvents: CarouselItem[] = useMemo(() => {
    if (events.length <= 1) {
      return events.map((e, idx) => ({
        ...e,
        _uniqueKey: `single-${e.id}`,
        _realIndex: idx,
      }));
    }
    const last = events[events.length - 1];
    const first = events[0];
    return [
      {
        ...last,
        _uniqueKey: `clone-prev-${last.id}`,
        _realIndex: events.length - 1,
      },
      ...events.map((e, idx) => ({
        ...e,
        _uniqueKey: `real-${e.id}-${idx}`,
        _realIndex: idx,
      })),
      {
        ...first,
        _uniqueKey: `clone-next-${first.id}`,
        _realIndex: 0,
      },
    ];
  }, [events]);

  // Khi đo được chiều rộng, cuộn ngay đến vị trí phần tử thật đầu tiên (index 1)
  useEffect(() => {
    if (containerWidth > 0 && events.length > 1) {
      scrollRef.current?.scrollTo({
        x: virtualIndexRef.current * containerWidth,
        animated: false,
      });
    }
  }, [containerWidth, events.length]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // Chuyển slide liên tiếp 1 -> 2 -> 3 -> 4 -> 1... hoàn toàn từ trái sang phải
  useEffect(() => {
    if (events.length <= 1 || containerWidth <= 0) return;

    const interval = setInterval(() => {
      if (isInteracting.current) return;

      const nextVirtual = virtualIndexRef.current + 1;
      virtualIndexRef.current = nextVirtual;

      const nextRealIndex = (nextVirtual - 1) % events.length;
      setCurrentIndex(nextRealIndex < 0 ? events.length - 1 : nextRealIndex);

      scrollRef.current?.scrollTo({
        x: nextVirtual * containerWidth,
        animated: true,
      });

      // Nếu vừa trượt tới bản sao phần tử đầu tiên ở cuối:
      if (nextVirtual === extendedEvents.length - 1) {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        // Chờ hiệu ứng trượt hoàn tất rồi âm thầm nhảy về vị trí thật (index 1)
        resetTimerRef.current = setTimeout(() => {
          scrollRef.current?.scrollTo({
            x: 1 * containerWidth,
            animated: false,
          });
          virtualIndexRef.current = 1;
        }, 450);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [events.length, containerWidth, extendedEvents.length]);

  const handleMomentumScrollEnd = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (containerWidth <= 0 || events.length <= 1) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / containerWidth);

    if (index >= extendedEvents.length - 1) {
      // Người dùng vuốt tới clone cuối -> âm thầm chuyển về index 1 thật
      scrollRef.current?.scrollTo({
        x: 1 * containerWidth,
        animated: false,
      });
      virtualIndexRef.current = 1;
      setCurrentIndex(0);
    } else if (index <= 0) {
      // Người dùng vuốt lùi về clone đầu -> âm thầm chuyển về index cuối thật
      scrollRef.current?.scrollTo({
        x: events.length * containerWidth,
        animated: false,
      });
      virtualIndexRef.current = events.length;
      setCurrentIndex(events.length - 1);
    } else {
      virtualIndexRef.current = index;
      setCurrentIndex(index - 1);
    }
  };

  if (events.length === 0) return null;

  return (
    <View
      style={styles.carouselContainer}
      onLayout={(e) => {
        const width = Math.round(e.nativeEvent.layout.width);
        if (width > 0 && width !== containerWidth) {
          setContainerWidth(width);
        }
      }}
    >
      {containerWidth > 0 && (
        <>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            contentOffset={
              events.length > 1 ? { x: 1 * containerWidth, y: 0 } : undefined
            }
            onScrollBeginDrag={() => {
              isInteracting.current = true;
              if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
            }}
            onScrollEndDrag={() => {
              if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
              resumeTimerRef.current = setTimeout(() => {
                isInteracting.current = false;
              }, 3000);
            }}
            onMomentumScrollEnd={handleMomentumScrollEnd}
          >
            {extendedEvents.map((event) => (
              <Pressable
                key={event._uniqueKey}
                onPress={() =>
                  router.push({
                    pathname: "/events/[id]",
                    params: { id: event.id },
                  })
                }
                style={[styles.carouselSlide, { width: containerWidth }]}
              >
                <ImageBackground
                  source={event.image}
                  resizeMode="cover"
                  style={styles.featured}
                  imageStyle={styles.featuredImage}
                >
                  {/* Lớp gradient sang trọng để text luôn nổi bật và sắc nét */}
                  <LinearGradient
                    colors={[
                      "rgba(10, 18, 36, 0.45)",
                      "rgba(10, 18, 36, 0.15)",
                      "rgba(10, 18, 36, 0.88)",
                      "rgba(10, 18, 36, 0.98)",
                    ]}
                    locations={[0, 0.35, 0.75, 1]}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* Thanh trên: Badge danh mục và số thứ tự slide */}
                  <View style={styles.slideTopBar}>
                    <Badge label={event.category} />
                    {events.length > 1 && (
                      <View style={styles.slideCounterBadge}>
                        <Text style={styles.slideCounterText}>
                          {currentIndex + 1} / {events.length}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Nội dung sự kiện */}
                  <View style={styles.featuredContent}>
                    <Text style={styles.featuredTitle} numberOfLines={2}>
                      {event.title}
                    </Text>
                    <View style={styles.featuredMetaRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={13}
                        color="#E2E8F0"
                      />
                      <Text style={styles.featuredMetaText}>
                        {formatEventDate(event.startsAt)}
                      </Text>
                      <Text style={styles.featuredMetaDot}>·</Text>
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color="#E2E8F0"
                      />
                      <Text style={styles.featuredMetaText} numberOfLines={1}>
                        {event.location}
                      </Text>
                    </View>
                    <View style={styles.featuredAction}>
                      <Text style={styles.featuredActionText}>
                        Xem chi tiết
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={12}
                        color={colors.primary}
                      />
                    </View>
                  </View>
                </ImageBackground>
              </Pressable>
            ))}
          </ScrollView>

          {/* Dải chấm chỉ số (dots pagination) */}
          {events.length > 1 && (
            <View style={styles.paginationDots}>
              {events.map((_, i) => (
                <Pressable
                  key={i}
                  hitSlop={8}
                  onPress={() => {
                    const targetVirtual = i + 1;
                    virtualIndexRef.current = targetVirtual;
                    setCurrentIndex(i);
                    scrollRef.current?.scrollTo({
                      x: targetVirtual * containerWidth,
                      animated: true,
                    });
                  }}
                  style={[
                    styles.dot,
                    i === currentIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function OrganizerBubble({
  organizer,
  realCount,
  onPress,
}: {
  organizer: Organizer;
  realCount?: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const countToDisplay = realCount !== undefined ? realCount : organizer.eventCount;

  return (
    <Pressable onPress={onPress} style={styles.organizerBubble}>
      <View
        style={[
          styles.organizerAvatarRing,
          { borderColor: organizer.color || theme.primary.val },
        ]}
      >
        <Image
          source={organizer.logo}
          style={styles.organizerAvatar}
          resizeMode="contain"
        />
        {organizer.isVerified ? (
          <View style={styles.organizerCheckWrap}>
            <Ionicons name="checkmark-circle" size={15} color="#0D6EFD" />
          </View>
        ) : null}
      </View>
      <Text
        numberOfLines={2}
        style={[styles.organizerName, { color: theme.color.val }]}
      >
        {organizer.shortName}
      </Text>
      <View
        style={[
          styles.organizerEventCountPill,
          { backgroundColor: theme.surface.val, borderColor: theme.border.val },
        ]}
      >
        <Text
          style={[styles.organizerEventCountText, { color: theme.muted.val }]}
        >
          {countToDisplay} sự kiện
        </Text>
      </View>
    </Pressable>
  );
}

function MagazineEventCard({
  event,
  isSaved,
  onToggleSave,
}: {
  event: RecommendedEvent;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
  const theme = useTheme();
  const dateObj = new Date(event.startsAt);
  const dayStr = isNaN(dateObj.getDate())
    ? "15"
    : String(dateObj.getDate()).padStart(2, "0");
  const monthStr = isNaN(dateObj.getMonth())
    ? "Thg 11"
    : `Thg ${dateObj.getMonth() + 1}`;
  const timeStr = isNaN(dateObj.getHours())
    ? "08:30"
    : `${String(dateObj.getHours()).padStart(2, "0")}:${String(
        dateObj.getMinutes(),
      ).padStart(2, "0")}`;

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/events/[id]", params: { id: event.id } })
      }
      style={[
        styles.magazineCard,
        {
          backgroundColor: theme.surface.val,
          borderColor: theme.border.val,
        },
      ]}
    >
      <View style={styles.magazineCoverWrap}>
        <Image
          source={event.image}
          style={styles.magazineCover}
          resizeMode="cover"
        />
        <LinearGradient
          colors={[
            "rgba(15, 23, 42, 0.65)",
            "transparent",
            "rgba(15, 23, 42, 0.88)",
          ]}
          locations={[0, 0.42, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top Floating Row */}
        <View style={styles.magazineTopBar}>
          <View
            style={[
              styles.magazineReasonBadge,
              {
                backgroundColor: "rgba(15, 23, 42, 0.8)",
                borderColor: `${event.recommendationColor}88`,
              },
            ]}
          >
            <Ionicons
              name={event.recommendationIcon}
              size={12}
              color={event.recommendationColor}
            />
            <Text
              style={[
                styles.magazineReasonText,
                { color: event.recommendationColor },
              ]}
            >
              {event.recommendationReason}
            </Text>
          </View>

          <Pressable
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            style={[
              styles.magazineSaveBtn,
              isSaved && { backgroundColor: "#FFB800" },
            ]}
          >
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={15}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        {/* Floating Date Badge */}
        <View style={styles.magazineDateBadge}>
          <Text style={styles.magazineDateDay}>{dayStr}</Text>
          <Text style={styles.magazineDateMonth}>{monthStr}</Text>
        </View>
      </View>

      {/* Magazine Body */}
      <View style={styles.magazineBody}>
        {/* Organizer & Category */}
        <View style={styles.magazineOrgRow}>
          <Image
            source={getOrganizerLogo(event.organizer)}
            style={styles.magazineOrgLogo}
            resizeMode="contain"
          />
          <Text
            numberOfLines={1}
            style={[styles.magazineOrgName, { color: theme.color.val }]}
          >
            {event.organizer}
          </Text>
          <Ionicons name="checkmark-circle" size={13} color="#0D6EFD" />
          <View style={styles.magazineCatPill}>
            <Text style={styles.magazineCatPillText}>{event.category}</Text>
          </View>
        </View>

        {/* Title */}
        <Text
          numberOfLines={2}
          style={[styles.magazineTitle, { color: theme.color.val }]}
        >
          {event.title}
        </Text>

        {/* Location & Time */}
        <View style={styles.magazineMetaRow}>
          <View style={styles.magazineMetaItem}>
            <Ionicons
              name="location-outline"
              size={13}
              color={theme.muted.val}
            />
            <Text
              numberOfLines={1}
              style={[styles.magazineMetaText, { color: theme.muted.val }]}
            >
              {event.location}
            </Text>
          </View>
          <View style={styles.magazineMetaItem}>
            <Ionicons name="time-outline" size={13} color={theme.muted.val} />
            <Text style={[styles.magazineMetaText, { color: theme.muted.val }]}>
              {timeStr}
            </Text>
          </View>
        </View>

        {/* Capacity Progress Bar */}
        <View style={styles.magazineCapacityWrap}>
          <View
            style={[
              styles.magazineCapacityTrack,
              { backgroundColor: theme.border.val },
            ]}
          >
            <View
              style={[
                styles.magazineCapacityBar,
                {
                  width: `${event.fillPercentage}%`,
                  backgroundColor:
                    event.fillPercentage >= 85
                      ? "#DC3545"
                      : event.fillPercentage >= 60
                        ? "#FD7E14"
                        : "#198754",
                },
              ]}
            />
          </View>
          <View style={styles.magazineCapacityInfo}>
            <Text
              style={[
                styles.magazineCapacityText,
                { color: theme.muted.val },
              ]}
            >
              {event.checkedInCount}/{event.capacity} check-in ({event.fillPercentage}%)
            </Text>
            <View style={styles.magazineActionRow}>
              <Text
                style={[
                  styles.magazineActionText,
                  { color: theme.primary.val },
                ]}
              >
                Xem chi tiết
              </Text>
              <Ionicons
                name="arrow-forward"
                size={12}
                color={theme.primary.val}
              />
            </View>
          </View>
        </View>
      </View>
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
  headerBrandRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginRight: 8,
  },
  headerLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerLogo: {
    width: 36,
    height: 36,
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
  avatarImage: { borderRadius: 22, height: 44, width: 44 },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  bellBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    height: 48,
    paddingHorizontal: 14,
  },
  searchPlaceholder: { color: colors.mutedText, flex: 1, fontSize: 14 },
  qrScanBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0D6EFD",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeading: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  sectionHint: { color: colors.mutedText, fontSize: 12 },
  link: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  carouselContainer: {
    borderRadius: 18,
    overflow: "hidden",
    minHeight: 220,
    position: "relative",
  },
  carouselSlide: {
    borderRadius: 18,
    overflow: "hidden",
  },
  slideTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    zIndex: 2,
  },
  slideCounterBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  slideCounterText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    zIndex: 3,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: "#FFFFFF",
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
  },
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
    paddingBottom: 26,
  },
  featuredTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27,
  },
  featuredMeta: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  featuredMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "nowrap",
  },
  featuredMetaText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
  },
  featuredMetaDot: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
  },
  featuredAction: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
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
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  bentoCardWrap: { flexBasis: "47%", flexGrow: 1 },
  bentoCard: {
    borderRadius: 22,
    padding: 14,
    minHeight: 126,
    justifyContent: "space-between",
    borderWidth: 1.2,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bentoWatermarkWrap: {
    position: "absolute",
    right: -12,
    bottom: -14,
    opacity: 0.14,
    transform: [{ rotate: "-12deg" }],
  },
  bentoWatermark: {},
  bentoTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bentoIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  bentoCountChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bentoCountText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  bentoBottomContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 10,
  },
  bentoTextWrap: {
    flex: 1,
    marginRight: 6,
  },
  bentoTitle: {
    fontSize: 15.5,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  bentoSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  bentoArrowWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  // Organizers showcase
  organizerScroll: {
    gap: 14,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  organizerBubble: {
    alignItems: "center",
    width: 88,
    gap: 6,
  },
  organizerAvatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    padding: 3,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  organizerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  organizerCheckWrap: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },
  organizerName: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 15,
  },
  organizerEventCountPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  organizerEventCountText: {
    fontSize: 10,
    fontWeight: "600",
  },

  // Magazine cards for "Có thể bạn quan tâm"
  magazineScroll: {
    gap: 16,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  magazineCard: {
    width: 300,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  magazineCoverWrap: {
    width: "100%",
    height: 165,
    position: "relative",
  },
  magazineCover: {
    width: "100%",
    height: "100%",
  },
  magazineTopBar: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },
  magazineReasonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  magazineReasonText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  magazineSaveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  magazineDateBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  magazineDateDay: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  magazineDateMonth: {
    color: "#E2E8F0",
    fontSize: 10,
    fontWeight: "700",
  },
  magazineBody: {
    padding: 14,
    gap: 8,
  },
  magazineOrgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  magazineOrgLogo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F8F9FA",
  },
  magazineOrgName: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  magazineCatPill: {
    backgroundColor: "rgba(13, 110, 253, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  magazineCatPillText: {
    color: "#0D6EFD",
    fontSize: 10,
    fontWeight: "800",
  },
  magazineTitle: {
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
  },
  magazineMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 2,
  },
  magazineMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  magazineMetaText: {
    fontSize: 12,
  },
  magazineCapacityWrap: {
    marginTop: 4,
    gap: 5,
  },
  magazineCapacityTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: "hidden",
  },
  magazineCapacityBar: {
    height: "100%",
    borderRadius: 2.5,
  },
  magazineCapacityInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  magazineCapacityText: {
    fontSize: 11,
    fontWeight: "600",
  },
  magazineActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  magazineActionText: {
    fontSize: 11,
    fontWeight: "800",
  },
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
  liveTagPill: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  podiumWidgetContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#0D6EFD",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  podiumWidgetGradient: {
    padding: 16,
    paddingBottom: 10,
  },
  podiumWidgetRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  podiumSpotCol: {
    flex: 1,
    alignItems: "center",
  },
  spotRank1: {
    zIndex: 3,
  },
  spotRank2: {
    zIndex: 2,
  },
  spotRank3: {
    zIndex: 1,
  },
  spotMedalIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  spotAvatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    borderWidth: 2.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  spotAvatarRank1: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderColor: "#F59E0B",
    borderWidth: 3,
  },
  spotAvatarText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0D6EFD",
  },
  spotStudentName: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  spotStudentMajor: {
    fontSize: 9.5,
    color: "#BFDBFE",
    textAlign: "center",
    marginBottom: 4,
  },
  spotScorePill: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 6,
  },
  spotScoreText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  spotStandBlock: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  standBlock1: {
    height: 42,
    backgroundColor: "rgba(245, 158, 11, 0.85)",
  },
  standBlock2: {
    height: 32,
    backgroundColor: "rgba(226, 232, 240, 0.55)",
  },
  standBlock3: {
    height: 24,
    backgroundColor: "rgba(234, 88, 12, 0.65)",
  },
  standBlockNum: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  spotFooterPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
  },
  spotFooterPromptText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#93C5FD",
  },
});
