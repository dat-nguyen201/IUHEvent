import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
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
import { appMode } from "@/constants/app-mode";
import { invalidateEventsCache } from "@/services/eventsApi";
import { ApiError } from "@/services/apiClient";
import { formatEventDate, isFutureEvent } from "@/utils/date";

import { ReminderModal } from "@/components/ReminderModal";
import { EventQrModal } from "@/components/EventQrModal";
import { AttendancePassModal } from "@/components/AttendancePassModal";
import { EventCertificateModal } from "@/components/EventCertificateModal";
import { CampusMapModal } from "@/components/CampusMapModal";
import { EventReviews } from "@/components/EventReviews";
import { Ionicons } from "@expo/vector-icons";
import { useEventReminder } from "@/hooks/use-event-reminder";
import { useTheme } from "@tamagui/core";
import type { StudentEvent } from "@/types/events";
import { scheduleAutoReminderOnRegister, triggerLocalNotificationNow } from "@/services/notificationService";
import { saveOfflineTicket, markOfflineTicketCheckedIn, removeOfflineTicket } from "@/services/offlineTicketService";

export default function EventDetailScreen() {
  const { id, fromChat } = useLocalSearchParams<{ id: string; fromChat?: string }>();
  const [event, setEvent] = useState<StudentEvent | undefined>(() =>
    id ? getEventByIdSync(id) : undefined,
  );
  const [isLoading, setIsLoading] = useState(!event);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [showCampusMap, setShowCampusMap] = useState(false);

  const {
    user,
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
      if (appMode === "remote") invalidateEventsCache();
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

  useEffect(() => {
    if (!id) return;
    setEvent(undefined);
    setError(null);
    setIsLoading(true);
  }, [id]);

  const checkedIn = checkedInEventIds.includes(event?.id ?? "");
  const handleBack = () => {
    if (fromChat === "1") {
      router.replace({ pathname: "/(tabs)", params: { openChat: "1" } });
      return;
    }
    router.back();
  };

  useEffect(() => {
    if (checkedIn && event?.id) {
      void markOfflineTicketCheckedIn(event.id);
    }
  }, [checkedIn, event?.id]);

  if (isLoading && !event) {
    return (
      <Screen>
        <Pressable onPress={handleBack} style={styles.backButton}>
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
        <Pressable onPress={handleBack} style={styles.backButton}>
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
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.color.val }]}>
            ‹ Quay lại
          </Text>
        </Pressable>
        <StatusMessage
          title="Không tìm thấy sự kiện"
          message="Sự kiện này có thể đã bị ẩn, lưu trữ hoặc đường dẫn không đúng."
          actionLabel="Về danh sách"
          onAction={() => router.replace("/(tabs)")}
        />
      </Screen>
    );
  }

  const saved = isEventSaved(event.id);
  const registered = isEventRegistered(event.id);
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

      // Tự động lên lịch nhắc nhở trước 30 phút
      void scheduleAutoReminderOnRegister({
        id: event.id,
        title: event.title,
        location: event.location,
        startsAt: event.startsAt,
      });

      // Tự động lưu bản vé Offline Ticket Pass vào bộ nhớ thiết bị
      const studentId = user?.studentId || "21000001";
      void saveOfflineTicket({
        eventId: event.id,
        title: event.title,
        location: event.location,
        startsAt: event.startsAt,
        organizer: event.organizer,
        category: event.category,
        studentName: user?.name || "Sinh viên IUH",
        studentId,
        major: user?.major || "Khoa Công nghệ Thông tin",
        status: "registered",
        qrValue: `student-event:${event.id}`,
        registeredAt: new Date().toISOString(),
        drlPoints: 5,
        certNumber: `IUH-${new Date().getFullYear()}-CERT-${event.id.toUpperCase()}-${studentId.slice(-4)}`,
      });

      // Bắn thông báo đẩy tức thì xác nhận đăng ký thành công
      void triggerLocalNotificationNow(
        `✅ Đăng ký thành công: ${event.title}`,
        `Đã lưu vé ngoại tuyến vào máy. Hệ thống sẽ tự động nhắc nhở bạn 30 phút trước giờ diễn ra tại ${event.location}.`,
        { eventId: event.id },
      );

      Alert.alert(
        "Đăng ký thành công",
        "Bạn đã đăng ký tham gia sự kiện. Vé điểm danh ngoại tuyến đã được lưu vào máy và hệ thống sẽ tự động nhắc bạn trước 30 phút!",
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
              void removeOfflineTicket(event.id);
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

  const handleShareEvent = async () => {
    if (!event) return;
    try {
      await Share.share({
        title: event.title,
        message: `📢 [IUH EVENT] Mời bạn cùng tham gia sự kiện:\n🎯 ${event.title}\n📍 Địa điểm: ${event.location}\n🕒 Thời gian: ${formatEventDate(event.startsAt)}\n🏛 Đơn vị tổ chức: ${event.organizer}\n\n👉 Mở app IUHEvent để đăng ký và quét mã check-in nhé!`,
      });
    } catch {
      // ignore
    }
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Pressable onPress={handleBack} style={styles.backButton}>
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
          {/* Card Top Action Bar with Compact QR & Share Icons */}
          <View style={styles.infoCardTopBar}>
            <Text style={[styles.infoCardHeading, { color: theme.color.val }]}>
              THÔNG TIN CHI TIẾT
            </Text>
            <View style={styles.infoCardActions}>
              <Pressable
                onPress={() => setShowQrModal(true)}
                style={[
                  styles.infoCardActionBtn,
                  {
                    backgroundColor: `${theme.primary.val}14`,
                    borderColor: `${theme.primary.val}35`,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Mã QR Sự kiện"
              >
                <Ionicons name="qr-code-outline" size={15} color={theme.primary.val} />
                <Text style={[styles.infoCardActionBtnText, { color: theme.primary.val }]}>
                  Mã QR
                </Text>
              </Pressable>

              <Pressable
                onPress={() => void handleShareEvent()}
                style={[
                  styles.infoCardActionBtn,
                  {
                    backgroundColor: `${theme.primary.val}14`,
                    borderColor: `${theme.primary.val}35`,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Chia sẻ sự kiện"
              >
                <Ionicons name="share-social-outline" size={15} color={theme.primary.val} />
                <Text style={[styles.infoCardActionBtnText, { color: theme.primary.val }]}>
                  Chia sẻ
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={[styles.infoLabel, { color: theme.muted.val }]}>
            Thời gian
          </Text>
          <Text style={[styles.infoValue, { color: theme.color.val }]}>
            {formatEventDate(event.startsAt)}
          </Text>
          <Text style={[styles.infoLabel, { color: theme.muted.val }]}>
            Địa điểm
          </Text>
          <Pressable
            onPress={() => setShowCampusMap(true)}
            style={styles.locationLinkRow}
            accessibilityRole="button"
            accessibilityLabel="Xem sơ đồ vị trí IUH"
          >
            <Text style={[styles.infoValue, { color: theme.color.val, flex: 1 }]}>
              {event.location}
            </Text>
            <View style={[styles.campusMapBadge, { backgroundColor: `${theme.primary.val}15` }]}>
              <Ionicons name="map-outline" size={13} color={theme.primary.val} />
              <Text style={[styles.campusMapBadgeText, { color: theme.primary.val }]}>Sơ đồ</Text>
            </View>
          </Pressable>
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
            <View style={styles.checkedInWrap}>
              <View style={styles.checkedInBanner}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <View style={styles.checkedInTextCol}>
                  <Text style={styles.checkedInTitle}>
                    Bạn đã điểm danh sự kiện này
                  </Text>
                  <Text style={styles.checkedInSub}>
                    Thông tin tham gia đã được ghi nhận vào lịch sử của bạn.
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setShowPassModal(true)}
                style={[styles.viewPassBtn, { backgroundColor: theme.primary.val }]}
                accessibilityRole="button"
              >
                <Ionicons name="ribbon-outline" size={18} color="#FFFFFF" />
                <Text style={styles.viewPassBtnText}>Xem Thẻ Điểm danh điện tử (+5đ ĐRL)</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowCertModal(true)}
                style={styles.viewCertBtn}
                accessibilityRole="button"
              >
                <Ionicons name="ribbon" size={18} color="#92400E" />
                <Text style={styles.viewCertBtnText}>Xem Giấy chứng nhận (E-Certificate)</Text>
              </Pressable>
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

          {/* Check-in QR Scanner Button (When registered & not yet checked-in) */}
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
                  backgroundColor: isEventExpired ? "#94A3B8" : "#0F172A",
                },
              ]}
            >
              <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
              <Text style={styles.qrButtonText}>
                {isEventExpired ? "Đã kết thúc" : "Quét mã Check-in"}
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

        {/* Student Reviews & Feedback */}
        <View style={{ marginTop: spacing.md, gap: 8 }}>
          <Text style={[styles.sectionHeadingTitle, { color: theme.color.val }]}>
            Đánh giá từ sinh viên
          </Text>
          <EventReviews
            eventId={event.id}
            currentUser={user}
            hasCheckedIn={checkedIn}
          />
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

      {/* Event QR Display Modal */}
      <EventQrModal
        visible={showQrModal}
        event={event}
        onClose={() => setShowQrModal(false)}
      />

      {/* Attendance Pass (Certificate) Modal */}
      <AttendancePassModal
        visible={showPassModal}
        event={event}
        user={user}
        isAlreadyCheckedIn={true}
        onClose={() => setShowPassModal(false)}
      />

      {/* Official Event E-Certificate Modal */}
      <EventCertificateModal
        visible={showCertModal}
        event={event}
        user={user}
        onClose={() => setShowCertModal(false)}
      />

      {/* Campus Map / Location Guide Modal */}
      <CampusMapModal
        visible={showCampusMap}
        locationName={event.location}
        onClose={() => setShowCampusMap(false)}
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
  infoCardTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.2)",
    marginBottom: 4,
  },
  infoCardHeading: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  infoCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoCardActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoCardActionBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
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
  locationLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  campusMapBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  campusMapBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  sectionHeadingTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
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
  checkedInWrap: {
    gap: 10,
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
  viewPassBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  viewPassBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  viewCertBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  viewCertBtnText: {
    color: "#92400E",
    fontSize: 14,
    fontWeight: "800",
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
  qrRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  qrCheckInButton: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 16,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    height: 50,
  },
  showQrButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
  },
  showQrButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  qrButtonIcon: {
    fontSize: 18,
  },
  qrButtonText: {
    color: "#38BDF8",
    fontSize: 15,
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
