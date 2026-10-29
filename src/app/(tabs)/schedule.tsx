import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import {
  Alert,
  FlatList,
  Pressable,
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

type ScheduleRow =
  | { type: "section"; title: string }
  | { type: "event"; event: StudentEvent };

export default function ScheduleScreen() {
  const { savedEventIds, checkedInEventIds, unsaveEvent } = useAppState();
  const theme = useTheme();
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const filterMode = Array.isArray(params.filter)
    ? params.filter[0]
    : (params.filter ?? "saved");

  const rows = useMemo<ScheduleRow[]>(() => {
    const savedEvents = savedEventIds
      .map((id) => getEventByIdSync(id))
      .filter((event): event is StudentEvent => Boolean(event))
      .sort(
        (first, second) =>
          new Date(first.startsAt).getTime() -
          new Date(second.startsAt).getTime(),
      );

    const visibleEvents =
      filterMode === "checkedIn"
        ? savedEvents.filter((event) => checkedInEventIds.includes(event.id))
        : savedEvents;

    const upcoming = visibleEvents.filter((event) =>
      isFutureEvent(event.startsAt),
    );
    const past = visibleEvents.filter(
      (event) => !isFutureEvent(event.startsAt),
    );

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
  }, [checkedInEventIds, filterMode, savedEventIds]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.color.val }]}>
          {filterMode === "checkedIn" ? "Sự kiện đã check-in" : "Lịch của tôi"}
        </Text>
        <Text style={[styles.subtitle, { color: theme.color.val }]}>
          {filterMode === "checkedIn"
            ? "Các sự kiện bạn đã điểm danh sẽ xuất hiện ở đây."
            : "Các sự kiện bạn đã lưu sẽ xuất hiện ở đây."}
        </Text>
      </View>

      <FlatList
        style={styles.list}
        data={rows}
        keyExtractor={(item) =>
          item.type === "section" ? item.title : item.event.id
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
                  <Text style={[styles.eventMeta, { color: theme.color.val }]}>
                    {formatEventDate(item.event.startsAt)}
                  </Text>
                </View>
                <Badge
                  label={isExpired ? "Đã kết thúc" : "Đã lưu"}
                  tone={isExpired ? "neutral" : "success"}
                />
              </View>
              <Text style={[styles.location, { color: theme.color.val }]}>
                {item.event.location}
              </Text>
              <View style={styles.cardFooter}>
                <Badge
                  label={isCheckedIn ? "Đã check-in" : "Chưa check-in"}
                  tone={isCheckedIn ? "success" : "neutral"}
                />
                <View style={styles.footerActions}>
                  {!isCheckedIn && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        if (isExpired) {
                          Alert.alert(
                            "Sự kiện đã kết thúc",
                            "Sự kiện này đã kết thúc, bạn không thể check-in hoặc quét QR nữa.",
                          );
                          return;
                        }
                        router.push({
                          pathname: "/check-in",
                          params: { eventId: item.event.id },
                        });
                      }}
                      style={[
                        styles.checkInQuickButton,
                        {
                          backgroundColor: isExpired
                            ? "#94A3B8"
                            : theme.primary.val,
                        },
                      ]}
                    >
                      <Ionicons color="#FFFFFF" name="scan-outline" size={14} />
                      <Text style={styles.checkInQuickText}>
                        {isExpired ? "Đã kết thúc" : "Quét QR"}
                      </Text>
                    </Pressable>
                  )}
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
              title="Bạn chưa lưu sự kiện nào"
              message="Vào tab Khám phá, chọn một sự kiện và bấm Lưu vào lịch để bắt đầu."
              actionLabel="Khám phá sự kiện"
              onAction={() =>
                router.push({
                  pathname: "/(tabs)/discover",
                  params: { focusSearch: "1" },
                })
              }
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
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
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
    justifyContent: "center",
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
    fontSize: 14,
  },
  cardFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
    fontWeight: "800",
  },
  footerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  checkInQuickButton: {
    alignItems: "center",
    backgroundColor: "#0F172A",
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
