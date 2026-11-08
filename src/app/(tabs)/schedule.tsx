import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Badge } from "@/components/Badge";
import { Screen } from "@/components/Screen";
import { colors, spacing } from "@/constants/app-theme";
import { useAppState } from "@/context/AppStateContext";
import { getEventByIdSync } from "@/services/eventService";
import type { StudentEvent } from "@/types/events";
import { formatEventDate, isFutureEvent } from "@/utils/date";
import { useTheme } from "@tamagui/core";

type FilterTab = "saved" | "registered" | "checkedIn";

type ScheduleRow =
  | { type: "section"; title: string }
  | { type: "event"; event: StudentEvent };

export default function ScheduleScreen() {
  const {
    savedEventIds,
    checkedInEventIds,
    registeredEventIds,
    unsaveEvent,
    cancelRegistration,
    refreshPersonalData,
    isLoadingPersonalData,
    personalDataError,
  } = useAppState();

  const theme = useTheme();
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const initialFilter: FilterTab =
    params.filter === "checkedIn"
      ? "checkedIn"
      : params.filter === "registered"
        ? "registered"
        : "saved";

  const [activeTab, setActiveTab] = useState<FilterTab>(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "this_week" | "this_month">("all");
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (params.filter === "checkedIn") setActiveTab("checkedIn");
    else if (params.filter === "registered") setActiveTab("registered");
    else if (params.filter === "saved") setActiveTab("saved");
  }, [params.filter]);

  const rows = useMemo<ScheduleRow[]>(() => {
    let targetIds: string[] = [];
    if (activeTab === "checkedIn") {
      targetIds = checkedInEventIds;
    } else if (activeTab === "registered") {
      targetIds = registeredEventIds;
    } else {
      targetIds = savedEventIds;
    }

    let events = targetIds
      .map((id) => getEventByIdSync(id))
      .filter((event): event is StudentEvent => Boolean(event));

    // Filter by search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      events = events.filter(
        (ev) =>
          ev.title.toLowerCase().includes(q) ||
          ev.location.toLowerCase().includes(q) ||
          (ev.organizer && ev.organizer.toLowerCase().includes(q)) ||
          ev.category.toLowerCase().includes(q),
      );
    }

    // Filter by date
    if (dateFilter === "today") {
      const now = new Date();
      events = events.filter((ev) => {
        const d = new Date(ev.startsAt);
        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
    } else if (dateFilter === "this_week") {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const next7 = new Date(now.getTime() + 7 * 86400000);
      events = events.filter((ev) => {
        const d = new Date(ev.startsAt);
        return d >= now && d <= next7;
      });
    } else if (dateFilter === "this_month") {
      const now = new Date();
      events = events.filter((ev) => {
        const d = new Date(ev.startsAt);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
    }

    events.sort(
      (first, second) =>
        new Date(first.startsAt).getTime() -
        new Date(second.startsAt).getTime(),
    );

    const upcoming = events.filter((event) => isFutureEvent(event.startsAt));
    const past = events.filter((event) => !isFutureEvent(event.startsAt));

    return [
      ...(upcoming.length > 0
        ? [
            { type: "section" as const, title: "Sắp diễn ra" },
            ...upcoming.map((event) => ({ type: "event" as const, event })),
          ]
        : []),
      ...(past.length > 0
        ? [
            { type: "section" as const, title: "Đã qua" },
            ...past.map((event) => ({ type: "event" as const, event })),
          ]
        : []),
    ];
  }, [
    activeTab,
    checkedInEventIds,
    registeredEventIds,
    savedEventIds,
    searchQuery,
    dateFilter,
  ]);

  const handleCancelRegistration = (eventId: string) => {
    Alert.alert(
      "Xác nhận hủy đăng ký",
      "Bạn có chắc muốn hủy đăng ký tham gia sự kiện này?",
      [
        { text: "Không", style: "cancel" },
        {
          text: "Hủy đăng ký",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelRegistration(eventId);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Không thể hủy đăng ký.";
              Alert.alert("Lỗi", msg);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerBrandRow}>
          <Image
            source={require("@/IMG/logo.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerTextWrap}>
            <Text style={[styles.eyebrow, { color: theme.primary.val }]}>
              IUH EVENT · LỊCH TRÌNH
            </Text>
            <Text style={[styles.title, { color: theme.color.val }]}>
              Lịch của tôi
            </Text>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: theme.muted.val }]}>
          Theo dõi các sự kiện bạn đã lưu, đã đăng ký và đã điểm danh.
        </Text>
      </View>

      {/* Search Bar + Date Filter + QR Check-in */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: theme.surface.val,
              borderColor: theme.border.val,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.muted.val} />
          <TextInput
            placeholder="Tìm sự kiện trong lịch..."
            placeholderTextColor={theme.muted.val}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.color.val }]}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={theme.muted.val} />
            </Pressable>
          )}
        </View>

        {/* Compact Calendar Date Filter Button */}
        <Pressable
          onPress={() => setShowDatePicker((prev) => !prev)}
          style={[
            styles.dateFilterBtn,
            {
              backgroundColor:
                dateFilter !== "all" ? theme.primary.val : theme.surface.val,
              borderColor:
                dateFilter !== "all" ? theme.primary.val : theme.border.val,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Lọc theo ngày"
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={dateFilter !== "all" ? "#FFFFFF" : theme.color.val}
          />
        </Pressable>

        {/* QR Check-in Button */}
        <Pressable
          onPress={() => router.push("/check-in")}
          style={[styles.qrScanBtn, { backgroundColor: theme.primary.val }]}
          accessibilityRole="button"
          accessibilityLabel="Quét mã QR Check-in"
        >
          <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Date Filter Pills (Toggleable) */}
      {showDatePicker && (
        <View style={styles.dateFilterRow}>
          {[
            { id: "all" as const, label: "Tất cả" },
            { id: "today" as const, label: "Hôm nay" },
            { id: "this_week" as const, label: "7 ngày tới" },
            { id: "this_month" as const, label: "Tháng này" },
          ].map((item) => {
            const isSelected = dateFilter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setDateFilter(item.id)}
                style={[
                  styles.datePill,
                  {
                    backgroundColor: isSelected
                      ? theme.primary.val
                      : theme.surface.val,
                    borderColor: isSelected
                      ? theme.primary.val
                      : theme.border.val,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.datePillText,
                    { color: isSelected ? "#FFFFFF" : theme.color.val },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        {(
          [
            {
              id: "saved" as const,
              label: "Đã lưu",
              count: savedEventIds.length,
              icon: "bookmark-outline" as const,
            },
            {
              id: "registered" as const,
              label: "Đã đăng ký",
              count: registeredEventIds.length,
              icon: "ticket-outline" as const,
            },
            {
              id: "checkedIn" as const,
              label: "Đã check-in",
              count: checkedInEventIds.length,
              icon: "qr-code-outline" as const,
            },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tabItem,
                {
                  backgroundColor: isActive
                    ? theme.primary.val
                    : theme.surface.val,
                  borderColor: isActive
                    ? theme.primary.val
                    : theme.border.val,
                },
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={isActive ? "#FFFFFF" : theme.muted.val}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? "#FFFFFF" : theme.color.val },
                ]}
              >
                {tab.label}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: isActive
                      ? "rgba(255, 255, 255, 0.25)"
                      : `${theme.primary.val}15`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    { color: isActive ? "#FFFFFF" : theme.primary.val },
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {personalDataError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{personalDataError}</Text>
          <Pressable onPress={() => refreshPersonalData()} style={styles.retryButton}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        style={styles.list}
        data={rows}
        keyExtractor={(item) =>
          item.type === "section" ? item.title : item.event.id
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoadingPersonalData}
            onRefresh={() => refreshPersonalData()}
            colors={[theme.primary.val]}
            tintColor={theme.primary.val}
          />
        }
        contentContainerStyle={
          rows.length === 0 ? styles.emptyListContent : styles.listContent
        }
        renderItem={({ item }) => {
          if (item.type === "section") {
            return (
              <Text style={[styles.sectionTitle, { color: theme.color.val }]}>
                {item.title}
              </Text>
            );
          }

          const isCheckedIn = checkedInEventIds.includes(item.event.id);
          const isRegistered = registeredEventIds.includes(item.event.id);
          const isSaved = savedEventIds.includes(item.event.id);
          const isExpired = !isFutureEvent(item.event.startsAt);

          return (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/events/[id]",
                  params: { id: item.event.id },
                })
              }
              style={[
                styles.card,
                {
                  backgroundColor: theme.surface.val,
                  borderColor: theme.border.val,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Badge label={item.event.category} tone="neutral" />
                <View style={styles.badgeRow}>
                  {isCheckedIn ? (
                    <Badge label="Đã check-in" tone="success" />
                  ) : isRegistered ? (
                    <Badge label="Đã đăng ký" tone="success" />
                  ) : isSaved ? (
                    <Badge label="Đã lưu" tone="neutral" />
                  ) : null}
                  {isExpired && <Badge label="Đã kết thúc" tone="neutral" />}
                </View>
              </View>

              <Text
                style={[styles.eventTitle, { color: theme.color.val }]}
                numberOfLines={2}
              >
                {item.event.title}
              </Text>

              <View style={styles.cardMetaBlock}>
                <View style={styles.metaRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={theme.primary.val}
                  />
                  <Text style={[styles.eventMeta, { color: theme.muted.val }]}>
                    {formatEventDate(item.event.startsAt)}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={theme.primary.val}
                  />
                  <Text
                    style={[styles.location, { color: theme.muted.val }]}
                    numberOfLines={1}
                  >
                    {item.event.location}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.footerActions}>
                  {!isCheckedIn && !isExpired && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push({
                          pathname: "/check-in",
                          params: { eventId: item.event.id },
                        });
                      }}
                      style={[
                        styles.checkInQuickButton,
                        { backgroundColor: "#0F172A" },
                      ]}
                    >
                      <Ionicons color="#FFFFFF" name="scan-outline" size={14} />
                      <Text style={styles.checkInQuickText}>Quét QR</Text>
                    </Pressable>
                  )}

                  {activeTab === "registered" && !isCheckedIn && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCancelRegistration(item.event.id);
                      }}
                      style={[
                        styles.removeButton,
                        { borderColor: theme.danger.val },
                      ]}
                    >
                      <Text
                        style={[
                          styles.removeButtonText,
                          { color: theme.danger.val },
                        ]}
                      >
                        Hủy đăng ký
                      </Text>
                    </Pressable>
                  )}

                  {activeTab === "saved" && (
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        unsaveEvent(item.event.id);
                      }}
                      style={[
                        styles.removeButton,
                        { borderColor: theme.danger.val },
                      ]}
                    >
                      <Text
                        style={[
                          styles.removeButtonText,
                          { color: theme.danger.val },
                        ]}
                      >
                        Hủy lưu
                      </Text>
                    </Pressable>
                  )}
                </View>

                <View style={styles.viewDetailHint}>
                  <Text style={[styles.viewDetailText, { color: theme.primary.val }]}>
                    Chi tiết
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={13}
                    color={theme.primary.val}
                  />
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <ScheduleEmptyState
            activeTab={activeTab}
            onExplore={() => router.push("/(tabs)/discover")}
            onCheckIn={() => router.push("/check-in")}
          />
        }
      />
    </Screen>
  );
}

function ScheduleEmptyState({
  activeTab,
  onExplore,
  onCheckIn,
}: {
  activeTab: FilterTab;
  onExplore: () => void;
  onCheckIn: () => void;
}) {
  const theme = useTheme();

  const config = {
    saved: {
      icon: "bookmark-outline" as const,
      title: "Chưa có sự kiện đã lưu",
      description:
        "Hãy khám phá các sự kiện và bấm Lưu để dễ dàng theo dõi thời gian và không bỏ lỡ ngày tổ chức.",
      actionLabel: "Khám phá sự kiện ngay",
      actionIcon: "compass-outline" as const,
      onAction: onExplore,
      tip: "💡 Mẹo: Sự kiện đã lưu sẽ giúp bạn nhận thông báo nhắc nhở trước ngày diễn ra.",
    },
    registered: {
      icon: "ticket-outline" as const,
      title: "Chưa đăng ký sự kiện nào",
      description:
        "Bạn chưa ghi danh tham gia sự kiện nào. Hãy tìm sự kiện phù hợp tại Khám phá và đăng ký nhé!",
      actionLabel: "Tìm sự kiện đăng ký",
      actionIcon: "search-outline" as const,
      onAction: onExplore,
      tip: "🎯 Mẹo: Một số buổi workshop có giới hạn chỗ, hãy đăng ký sớm để được tham gia.",
    },
    checkedIn: {
      icon: "qr-code-outline" as const,
      title: "Chưa có lượt điểm danh",
      description:
        "Khi tham gia sự kiện tại trường, quét mã QR check-in để được ghi nhận vào lịch sử của bạn.",
      actionLabel: "Quét mã QR Check-in",
      actionIcon: "scan-outline" as const,
      onAction: onCheckIn,
      tip: "📍 Mẹo: Bạn có thể quét trực tiếp bằng camera hoặc chọn nhập mã Event ID thủ công.",
    },
  }[activeTab];

  return (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconCircle,
          { backgroundColor: `${theme.primary.val}14` },
        ]}
      >
        <View
          style={[
            styles.emptyIconInner,
            { backgroundColor: `${theme.primary.val}22` },
          ]}
        >
          <Ionicons name={config.icon} size={42} color={theme.primary.val} />
        </View>
      </View>

      <Text style={[styles.emptyTitle, { color: theme.color.val }]}>
        {config.title}
      </Text>

      <Text style={[styles.emptyDescription, { color: theme.muted.val }]}>
        {config.description}
      </Text>

      <Pressable
        onPress={config.onAction}
        style={[
          styles.emptyActionBtn,
          {
            backgroundColor: theme.primary.val,
            shadowColor: theme.primary.val,
          },
        ]}
      >
        <Ionicons name={config.actionIcon} size={18} color="#FFFFFF" />
        <Text style={styles.emptyActionText}>{config.actionLabel}</Text>
      </Pressable>

      <View
        style={[
          styles.tipCard,
          {
            backgroundColor: theme.surface.val,
            borderColor: theme.border.val,
          },
        ]}
      >
        <Text style={[styles.tipText, { color: theme.muted.val }]}>
          {config.tip}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  dateFilterBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  qrScanBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0D6EFD",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },
  dateFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.sm,
  },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  tabBar: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tabItem: {
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  retryText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 13,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: spacing.lg,
  },
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyIconInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.xl,
    paddingVertical: 13,
    borderRadius: 999,
    marginTop: spacing.sm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  tipCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.md,
    maxWidth: 320,
    width: "100%",
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
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
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  cardMetaBlock: {
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eventMeta: {
    fontSize: 13,
    fontWeight: "500",
  },
  location: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  cardFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(150, 150, 150, 0.2)",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
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
    fontSize: 12,
    fontWeight: "800",
  },
  footerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  checkInQuickButton: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  checkInQuickText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  viewDetailHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewDetailText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
