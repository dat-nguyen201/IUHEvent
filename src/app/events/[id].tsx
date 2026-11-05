import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Badge } from "@/components/Badge";
import { Screen } from "@/components/Screen";
import { StatusMessage } from "@/components/StatusMessage";
import { colors, spacing } from "@/constants/app-theme";
import { useAppState } from "@/context/AppStateContext";
import { getEventById, getEventByIdSync } from "@/services/eventService";
import { ApiError } from "@/services/apiClient";
import { formatEventDate, isFutureEvent } from "@/utils/date";

import { ReminderModal } from "@/components/ReminderModal";
import { useEventReminder } from "@/hooks/use-event-reminder";
import { useTheme } from "@tamagui/core";
import type { StudentEvent } from "@/types/events";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<StudentEvent | undefined>(() =>
    id ? getEventByIdSync(id) : undefined,
  );
  const [isLoading, setIsLoading] = useState(!event);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const {
    checkedInEventIds,
    isEventSaved,
    isEventRegistered,
    saveEvent,
    unsaveEvent,
    registerEvent,
    cancelRegistration,
  } = useAppState();
  const theme = useTheme();

  const [reminderModalVisible, setReminderModalVisible] = useState(false);

  const {
    isScheduled: isReminderSet,
    scheduleReminder,
    removeReminder,
  } = useEventReminder(
    event?.id ?? "",
    event?.title ?? "",
    event?.location ?? "",
    event?.startsAt ?? "",
  );

  const loadEventDetail = useCallback(async () => {
    if (!id) return;
    if (!event) setIsLoading(true);
    setError(null);
    try {
      const data = await getEventById(id);
      if (data) {
        setEvent(data);
      } else {
        setError("EVENT_NOT_FOUND");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("EVENT_NOT_FOUND");
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : "Không thể tải thông tin sự kiện. Hãy kiểm tra kết nối mạng.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, event]);

  useEffect(() => {
    void loadEventDetail();
  }, [loadEventDetail]);

  if (isLoading && !event) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.color.val }]}>
            ‹ Quay lại
          </Text>
        </Pressable>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary.val} />
          <Text style={{ marginTop: 12, color: theme.muted.val }}>
            Đang tải thông tin sự kiện...
          </Text>
        </View>
      </Screen>
    );
  }

  if (error && error !== "EVENT_NOT_FOUND" && !event) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.color.val }]}>
            ‹ Quay lại
          </Text>
        </Pressable>
        <StatusMessage
          title="Không thể tải sự kiện"
          message={error}
          actionLabel="Thử lại"
          onAction={() => loadEventDetail()}
        />
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.color.val }]}>
            ‹ Quay lại
          </Text>
        </Pressable>
        <StatusMessage
          title="Không tìm thấy sự kiện"
          message="Sự kiện này có thể đã bị xóa hoặc đường dẫn không đúng."
          actionLabel="Về danh sách"
          onAction={() => router.replace("/(tabs)")}
        />
      </Screen>
    );
  }

  const saved = isEventSaved(event.id);
  const registered = isEventRegistered(event.id);
  const checkedIn = checkedInEventIds.includes(event.id);
  const isEventExpired = !isFutureEvent(event.startsAt);

  const handleToggleSave = async () => {
    if (!saved && isEventExpired) {
      Alert.alert(
        "Sự kiện đã kết thúc",
        "Sự kiện này đã kết thúc, bạn không thể lưu vào lịch nữa.",
      );
      return;
    }

    try {
      if (saved) {
        await unsaveEvent(event.id);
      } else {
        await saveEvent(event.id);
      }
    } catch (err) {
      Alert.alert(
        "Lỗi",
        err instanceof ApiError
          ? err.message
          : "Không thể thực hiện thao tác. Hãy thử lại.",
      );
    }
  };

  const handleRegister = async () => {
    if (isEventExpired) {
      Alert.alert(
        "Sự kiện đã kết thúc",
        "Sự kiện này đã bắt đầu hoặc kết thúc, không thể đăng ký tham gia.",
      );
      return;
    }

    setIsActionLoading(true);
    try {
      await registerEvent(event.id);
      Alert.alert(
        "Đăng ký thành công",
        "Bạn đã đăng ký tham gia sự kiện. Hãy đến đúng giờ và chuẩn bị mã QR để điểm danh nhé!",
      );
    } catch (err) {
      Alert.alert(
        "Đăng ký không thành công",
        err instanceof ApiError ? err.message : "Hãy kiểm tra kết nối mạng và thử lại.",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelRegistration = () => {
    if (checkedIn) {
      Alert.alert(
        "Không thể hủy",
        "Bạn đã điểm danh tham gia sự kiện, không thể hủy đăng ký.",
      );
      return;
    }

    Alert.alert(
      "Xác nhận hủy đăng ký",
      "Bạn có chắc muốn hủy đăng ký tham gia sự kiện này?",
      [
        { text: "Giữ lại", style: "cancel" },
        {
          text: "Hủy đăng ký",
          style: "destructive",
          onPress: async () => {
            setIsActionLoading(true);
            try {
              await cancelRegistration(event.id);
              Alert.alert("Đã hủy đăng ký", "Bạn đã hủy đăng ký tham gia sự kiện.");
            } catch (err) {
              Alert.alert(
                "Lỗi",
                err instanceof ApiError ? err.message : "Không thể hủy đăng ký. Hãy thử lại.",
              );
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.color.val }]}>
            ‹ Quay lại
          </Text>
        </Pressable>

        <Image source={event.image} style={styles.image} />

        <View style={styles.titleBlock}>
          <Badge label={event.category} tone="neutral" />
          <Text style={[styles.title, { color: theme.color.val }]}>
            {event.title}
          </Text>
          <Text style={[styles.description, { color: theme.muted.val }]}>
            {event.description}
          </Text>
        </View>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.surface.val,
              borderColor: theme.border.val,
            },
          ]}
        >
          <Text style={[styles.infoLabel, { color: theme.muted.val }]}>
            Thời gian
          </Text>
          <Text style={[styles.infoValue, { color: theme.color.val }]}>
            {formatEventDate(event.startsAt)}
          </Text>
          <Text style={[styles.infoLabel, { color: theme.muted.val }]}>
            Địa điểm
          </Text>
          <Text style={[styles.infoValue, { color: theme.color.val }]}>
            {event.location}
          </Text>
          <Text style={[styles.infoLabel, { color: theme.muted.val }]}>
            Đơn vị tổ chức
          </Text>
          <Text style={[styles.infoValue, { color: theme.color.val }]}>
            {event.organizer}
          </Text>
          {event.capacity > 0 && (
            <>
              <Text style={[styles.infoLabel, { color: theme.muted.val }]}>
                Sức chứa
              </Text>
              <Text style={[styles.infoValue, { color: theme.color.val }]}>
                {event.capacity} người tham gia
              </Text>
            </>
          )}
        </View>

        <View style={styles.statusRow}>
          <Badge
            label={registered ? "Đã đăng ký" : "Chưa đăng ký"}
            tone={registered ? "success" : "neutral"}
          />
          <Badge
            label={saved ? "Đã lưu" : "Chưa lưu"}
            tone={saved ? "success" : "neutral"}
          />
          <Badge
            label={checkedIn ? "Đã check-in" : "Chưa check-in"}
            tone={checkedIn ? "success" : "neutral"}
          />
          {isReminderSet && <Badge label="Đã bật nhắc nhở" tone="success" />}
        </View>

        {/* Action Section */}
        <View style={styles.actionSection}>
          {/* Registration Button */}
          {checkedIn ? (
            <View style={styles.checkedInBanner}>
              <Text style={styles.checkedInIcon}>✅</Text>
              <View style={styles.checkedInTextCol}>
                <Text style={styles.checkedInTitle}>
                  Bạn đã điểm danh sự kiện này
                </Text>
                <Text style={styles.checkedInSub}>
                  Thông tin tham gia đã được ghi nhận vào lịch sử của bạn.
                </Text>
              </View>
            </View>
          ) : registered ? (
            <Pressable
              onPress={handleCancelRegistration}
              disabled={isActionLoading}
              style={[
                styles.cancelRegButton,
                {
                  backgroundColor: theme.surface.val,
                  borderColor: theme.danger.val,
                },
              ]}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color={theme.danger.val} />
              ) : (
                <Text style={[styles.cancelRegButtonText, { color: theme.danger.val }]}>
                  Hủy đăng ký tham gia
                </Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              onPress={handleRegister}
              disabled={isActionLoading || isEventExpired}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: isEventExpired
                    ? "#94A3B8"
                    : theme.primary.val,
                },
              ]}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isEventExpired ? "Sự kiện đã kết thúc" : "Đăng ký tham gia ngay"}
                </Text>
              )}
            </Pressable>
          )}

          {/* QR Check-in Action */}
          {!checkedIn && (
            <Pressable
              onPress={() => {
                if (isEventExpired) {
                  Alert.alert(
                    "Sự kiện đã kết thúc",
                    "Sự kiện này đã kết thúc, bạn không thể check-in hoặc quét QR nữa.",
                  );
                  return;
                }
                router.push({
                  pathname: "/check-in",
                  params: { eventId: event.id },
                });
              }}
              style={[
                styles.qrCheckInButton,
                {
                  backgroundColor: isEventExpired
                    ? "#94A3B8"
                    : "#0F172A",
                },
              ]}
            >
              <Text style={styles.qrButtonIcon}>📷</Text>
              <Text style={styles.qrButtonText}>
                {isEventExpired
                  ? "Sự kiện đã kết thúc"
                  : "Quét mã QR Check-in"}
              </Text>
            </Pressable>
          )}

          {/* Event Reminder Button */}
          <Pressable
            onPress={() => {
              if (isEventExpired) {
                Alert.alert(
                  "Sự kiện đã kết thúc",
                  "Sự kiện này đã kết thúc, bạn không thể đặt nhắc nhở nữa.",
                );
                return;
              }
              setReminderModalVisible(true);
            }}
            style={[
              styles.reminderButton,
              {
                backgroundColor: theme.surface.val,
                borderColor: theme.border.val,
              },
              isReminderSet && { borderColor: theme.primary.val },
            ]}
          >
            <Text style={styles.reminderButtonIcon}>
              {isReminderSet ? "⏰" : "🔔"}
            </Text>
            <Text
              style={[
                styles.reminderButtonText,
                isReminderSet && styles.reminderButtonTextActive,
              ]}
            >
              {isReminderSet
                ? "Đã đặt nhắc nhở (Bấm để đổi / hủy)"
                : "Nhắc tôi khi sắp diễn ra"}
            </Text>
          </Pressable>

          {/* Bookmark Button (Save/Unsave) */}
          <Pressable
            onPress={handleToggleSave}
            style={[
              styles.secondaryButton,
              {
                backgroundColor: theme.surface.val,
                borderColor: saved ? theme.danger.val : theme.border.val,
              },
            ]}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: saved ? theme.danger.val : theme.color.val },
              ]}
            >
              {saved ? "Bỏ lưu khỏi lịch" : "Lưu vào lịch"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Reminder Options Modal */}
      <ReminderModal
        visible={reminderModalVisible}
        onClose={() => setReminderModalVisible(false)}
        isScheduled={isReminderSet}
        onSelectOption={(minutesBefore, isDemoNow) => {
          if (isEventExpired) {
            Alert.alert(
              "Sự kiện đã kết thúc",
              "Sự kiện này đã kết thúc, bạn không thể đặt nhắc nhở nữa.",
            );
            return;
          }
          void scheduleReminder(minutesBefore, isDemoNow);
        }}
        onCancelReminder={() => {
          removeReminder();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  backText: {
    color: colors.text,
    fontWeight: "800",
  },
  image: {
    backgroundColor: colors.border,
    borderRadius: 20,
    height: 220,
    width: "100%",
  },
  titleBlock: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
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
    fontWeight: "800",
    marginTop: spacing.xs,
    textTransform: "uppercase",
  },
  infoValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  cancelRegButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
  },
  cancelRegButtonText: {
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  actionSection: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  checkedInBanner: {
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderColor: "#86EFAC",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  checkedInIcon: {
    fontSize: 24,
  },
  checkedInTextCol: {
    flex: 1,
    gap: 2,
  },
  checkedInTitle: {
    color: "#166534",
    fontSize: 15,
    fontWeight: "800",
  },
  checkedInSub: {
    color: "#15803D",
    fontSize: 12,
  },
  qrCheckInButton: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 16,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  qrButtonIcon: {
    fontSize: 18,
  },
  qrButtonText: {
    color: "#38BDF8",
    fontSize: 16,
    fontWeight: "900",
  },
  reminderButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  reminderButtonIcon: {
    fontSize: 18,
  },
  reminderButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  reminderButtonTextActive: {
    color: "#16A34A",
  },
});
