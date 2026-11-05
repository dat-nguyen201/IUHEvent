import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Badge } from "@/components/Badge";
import { Screen } from "@/components/Screen";
import { StatusMessage } from "@/components/StatusMessage";
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

    const events = targetIds
      .map((id) => getEventByIdSync(id))
      .filter((event): event is StudentEvent => Boolean(event))
      .sort(
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
  }, [activeTab, checkedInEventIds, registeredEventIds, savedEventIds]);

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

  const getEmptyMessage = () => {
    if (activeTab === "checkedIn") {
      return {
        title: "Bạn chưa check-in sự kiện nào",
        message: "Khi tham gia sự kiện, quét mã QR check-in để được ghi nhận vào lịch sử học tập.",
        actionLabel: "Quét mã QR ngay",
        onAction: () => router.push("/check-in"),
      };
    }
    if (activeTab === "registered") {
      return {
        title: "Bạn chưa đăng ký sự kiện nào",
        message: "Hãy tìm kiếm sự kiện phù hợp tại tab Khám phá và bấm Đăng ký tham gia.",
        actionLabel: "Khám phá sự kiện",
        onAction: () => router.push("/(tabs)/discover"),
      };
    }
    return {
      title: "Bạn chưa lưu sự kiện nào",
      message: "Vào tab Khám phá, chọn một sự kiện và bấm Lưu vào lịch để theo dõi.",
      actionLabel: "Khám phá sự kiện",
      onAction: () => router.push("/(tabs)/discover"),
    };
  };

  const emptyInfo = getEmptyMessage();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.color.val }]}>
          Lịch của tôi
        </Text>
        <Text style={[styles.subtitle, { color: theme.muted.val }]}>
          Theo dõi các sự kiện bạn đã lưu, đã đăng ký và đã điểm danh.
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab("saved")}
          style={[
            styles.tabItem,
            {
              backgroundColor:
                activeTab === "saved" ? theme.primary.val : theme.surface.val,
              borderColor:
                activeTab === "saved" ? theme.primary.val : theme.border.val,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "saved" ? "#FFFFFF" : theme.color.val },
            ]}
          >
            Đã lưu ({savedEventIds.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("registered")}
          style={[
            styles.tabItem,
            {
              backgroundColor:
                activeTab === "registered"
                  ? theme.primary.val
                  : theme.surface.val,
              borderColor:
                activeTab === "registered"
                  ? theme.primary.val
                  : theme.border.val,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "registered" ? "#FFFFFF" : theme.color.val,
              },
            ]}
          >
            Đã đăng ký ({registeredEventIds.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("checkedIn")}
          style={[
            styles.tabItem,
            {
              backgroundColor:
                activeTab === "checkedIn"
                  ? theme.primary.val
                  : theme.surface.val,
              borderColor:
                activeTab === "checkedIn"
                  ? theme.primary.val
                  : theme.border.val,
            },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "checkedIn" ? "#FFFFFF" : theme.color.val,
              },
            ]}
          >
            Đã check-in ({checkedInEventIds.length})
          </Text>
        </Pressable>
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
          rows.length === 0
            ? { flexGrow: 1, justifyContent: "center" }
            : styles.listContent
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
                <View style={styles.cardTitleWrap}>
                  <Text style={[styles.eventTitle, { color: theme.color.val }]}>
                    {item.event.title}
                  </Text>
                  <Text style={[styles.eventMeta, { color: theme.muted.val }]}>
                    {formatEventDate(item.event.startsAt)}
                  </Text>
                </View>
                <Badge
                  label={item.event.category}
                  tone="neutral"
                />
              </View>

              <Text style={[styles.location, { color: theme.muted.val }]}>
                📍 {item.event.location}
              </Text>

              <View style={styles.cardFooter}>
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
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: theme.surface.val,
                borderColor: theme.border.val,
              },
            ]}
          >
            <StatusMessage
              title={emptyInfo.title}
              message={emptyInfo.message}
              actionLabel={emptyInfo.actionLabel}
              onAction={emptyInfo.onAction}
            />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
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
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
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
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    marginVertical: spacing.md,
    paddingVertical: spacing.sm,
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
  },
  cardTitleWrap: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  eventMeta: {
    fontSize: 13,
  },
  location: {
    fontSize: 13,
  },
  cardFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
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
});
