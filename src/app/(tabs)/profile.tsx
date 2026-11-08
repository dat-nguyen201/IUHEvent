import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Badge } from "@/components/Badge";
import { Screen } from "@/components/Screen";
import { appMode } from "@/constants/app-mode";
import { colors, spacing } from "@/constants/app-theme";
import { useAppState } from "@/context/AppStateContext";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme, type ThemePreference } from "@/context/ThemeContext";
import { useTheme } from "@tamagui/core";
import { getAvatarUri, setAvatarUri } from "@/services/avatarStorage";

export default function ProfileScreen() {
  const { user, savedEventIds, checkedInEventIds } = useAppState();
  const { logout } = useAuth();
  const theme = useTheme();
  const { preference, setPreference } = useAppTheme();
  const [avatarUri, setAvatarUriState] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setAvatarUriState(null);
      return;
    }
    void getAvatarUri(user.id).then(setAvatarUriState);
  }, [user?.id]);

  const baseDrl = 65;
  const drlPoints = Math.min(100, baseDrl + checkedInEventIds.length * 5);
  const drlRank =
    drlPoints >= 90
      ? { label: "Xuất sắc", color: "#10B981", badge: "🏆" }
      : drlPoints >= 80
        ? { label: "Tốt", color: "#0D6EFD", badge: "🥇" }
        : drlPoints >= 65
          ? { label: "Khá", color: "#F59E0B", badge: "🥈" }
          : { label: "Trung bình", color: "#6B7280", badge: "🥉" };

  const achievements = [
    {
      id: "first_checkin",
      title: "Khởi đầu năng nổ",
      desc: "Check-in 1 sự kiện đầu tiên",
      icon: "footsteps-outline" as const,
      color: "#0D6EFD",
      unlocked: checkedInEventIds.length >= 1,
      progress: `${Math.min(1, checkedInEventIds.length)}/1`,
    },
    {
      id: "active_student",
      title: "Chiến thần sự kiện",
      desc: "Tham gia điểm danh 3 sự kiện",
      icon: "flame-outline" as const,
      color: "#EF4444",
      unlocked: checkedInEventIds.length >= 3,
      progress: `${Math.min(3, checkedInEventIds.length)}/3`,
    },
    {
      id: "connector",
      title: "Chuyên gia theo dõi",
      desc: "Lưu từ 3 sự kiện vào lịch cá nhân",
      icon: "bookmark-outline" as const,
      color: "#8B5CF6",
      unlocked: savedEventIds.length >= 3,
      progress: `${Math.min(3, savedEventIds.length)}/3`,
    },
    {
      id: "elite",
      title: "Sinh viên tiêu biểu",
      desc: "Đạt Điểm rèn luyện từ 85 trở lên",
      icon: "ribbon-outline" as const,
      color: "#F59E0B",
      unlocked: drlPoints >= 85,
      progress: `${drlPoints}/85`,
    },
  ];

  const chooseAvatar = async () => {
    if (!user?.id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Không có quyền truy cập ảnh",
        "Bạn có thể cấp quyền trong phần Cài đặt của thiết bị để chọn ảnh đại diện.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const uri = result.assets[0]?.uri;
    if (!uri) return;
    await setAvatarUri(user.id, uri);
    setAvatarUriState(uri);
  };

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: "system", label: "Theo thiết bị" },
    { value: "light", label: "Sáng" },
    { value: "dark", label: "Tối" },
  ];

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.primary.val }]}>
            TÀI KHOẢN IUH
          </Text>
          <Text style={[styles.title, { color: theme.color.val }]}>
            Hồ sơ của tôi
          </Text>
        </View>

        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.surface.val,
              borderColor: theme.border.val,
            },
          ]}
        >
          <View style={styles.identityRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đổi ảnh đại diện"
              onPress={() => void chooseAvatar()}
              style={styles.avatar}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{user?.name.charAt(0) ?? "S"}</Text>
              )}
              <View style={styles.avatarEditBadge}>
                <Text style={styles.avatarEditText}>+</Text>
              </View>
            </Pressable>
            <View style={styles.identityCopy}>
              <Text style={[styles.name, { color: theme.color.val }]}>
                {user?.name ?? "Sinh viên IUH"}
              </Text>
              <Text style={[styles.studentId, { color: theme.muted.val }]}>
                {user?.studentId}
              </Text>
            </View>
            <Badge
              label={
                user?.role === "admin"
                  ? appMode === "demo"
                    ? "Admin demo"
                    : "Admin"
                  : "Sinh viên"
              }
              tone="success"
            />
          </View>
          <View
            style={[styles.divider, { backgroundColor: theme.border.val }]}
          />
          <Text style={[styles.detailLabel, { color: theme.muted.val }]}>
            Email
          </Text>
          <Text style={[styles.detailValue, { color: theme.color.val }]}>
            {user?.email}
          </Text>
          <Text style={[styles.detailLabel, { color: theme.muted.val }]}>
            Đơn vị
          </Text>
          <View style={styles.universityRow}>
            <Image
              source={require('@/IMG/logo.png')}
              style={styles.universityLogo}
              resizeMode="contain"
            />
            <Text style={[styles.detailValue, { color: theme.color.val }]}>
              Trường Đại học Công nghiệp TP.HCM
            </Text>
          </View>
        </View>

        {appMode === "remote" &&
        user?.role === "admin" &&
        user.status === "active" ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/admin/events" as never)}
            style={[styles.adminAccess, { backgroundColor: theme.primary.val }]}
          >
            <Text style={styles.adminAccessTitle}>Quản trị sự kiện IUH</Text>
            <Text style={styles.adminAccessCaption}>
              Quản lý sự kiện và tài khoản sinh viên →
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: theme.color.val }]}>
            Hoạt động của bạn
          </Text>
        </View>
        <View
          style={[
            styles.metrics,
            {
              backgroundColor: theme.surface.val,
              borderColor: theme.border.val,
            },
          ]}
        >
          <Pressable
            onPress={() => router.push("/(tabs)/schedule")}
            style={styles.metric}
          >
            <Text style={[styles.metricValue, { color: theme.color.val }]}>
              {savedEventIds.length}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.muted.val }]}>
              Sự kiện đã lưu
            </Text>
          </Pressable>
          <View
            style={[
              styles.metricDivider,
              { backgroundColor: theme.border.val },
            ]}
          />
          <Pressable
            onPress={() => router.push("/check-in")}
            style={styles.metric}
          >
            <Text style={[styles.metricValue, { color: theme.color.val }]}>
              {checkedInEventIds.length}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.muted.val }]}>
              Lần check-in
            </Text>
          </Pressable>
        </View>

        {/* Điểm rèn luyện & Thành tích */}
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: theme.color.val }]}>
            Điểm rèn luyện & Thành tích
          </Text>
        </View>

        <View
          style={[
            styles.drlCard,
            {
              backgroundColor: theme.surface.val,
              borderColor: theme.border.val,
            },
          ]}
        >
          {/* Header Score Row */}
          <View style={styles.drlHeader}>
            <View style={styles.drlScoreWrap}>
              <Text style={[styles.drlNumber, { color: theme.color.val }]}>
                {drlPoints}
              </Text>
              <Text style={[styles.drlMax, { color: theme.muted.val }]}>
                / 100 điểm
              </Text>
            </View>

            <View
              style={[
                styles.drlRankPill,
                {
                  backgroundColor: `${drlRank.color}15`,
                  borderColor: `${drlRank.color}40`,
                },
              ]}
            >
              <Text style={styles.drlRankBadge}>{drlRank.badge}</Text>
              <Text style={[styles.drlRankText, { color: drlRank.color }]}>
                Xếp loại {drlRank.label}
              </Text>
            </View>
          </View>

          {/* Progress Bar Track */}
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: `${theme.border.val}40` },
            ]}
          >
            <LinearGradient
              colors={["#0D6EFD", "#06B6D4"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.progressBarFill, { width: `${drlPoints}%` }]}
            />
          </View>

          {/* Target / Rule Hint */}
          <View style={styles.drlTargetRow}>
            <Text style={[styles.drlTargetText, { color: theme.muted.val }]}>
              {drlPoints >= 90
                ? "🎉 Chúc mừng! Bạn đang đạt mức Rèn luyện Xuất sắc!"
                : `Tham gia thêm ${Math.ceil((90 - drlPoints) / 5)} sự kiện nữa để đạt mức Xuất sắc (90đ).`}
            </Text>
            <Text style={[styles.drlRuleText, { color: theme.primary.val }]}>
              +5đ / sự kiện
            </Text>
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: theme.border.val, marginVertical: 12 },
            ]}
          />

          {/* Huy hiệu thành tích */}
          <Text style={[styles.achievementsTitle, { color: theme.color.val }]}>
            Huy hiệu sinh viên ({achievements.filter((a) => a.unlocked).length}/
            {achievements.length})
          </Text>

          <View style={styles.achievementsGrid}>
            {achievements.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.achievementItem,
                  {
                    backgroundColor: item.unlocked
                      ? theme.background.val
                      : `${theme.border.val}15`,
                    borderColor: item.unlocked
                      ? `${item.color}45`
                      : theme.border.val,
                    opacity: item.unlocked ? 1 : 0.65,
                  },
                ]}
              >
                <View
                  style={[
                    styles.achievementIconWrap,
                    {
                      backgroundColor: item.unlocked
                        ? `${item.color}15`
                        : "rgba(100, 116, 139, 0.1)",
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={item.unlocked ? item.color : theme.muted.val}
                  />
                </View>

                <View style={styles.achievementTextWrap}>
                  <View style={styles.achievementTitleRow}>
                    <Text
                      style={[
                        styles.achievementTitle,
                        {
                          color: item.unlocked
                            ? theme.color.val
                            : theme.muted.val,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {item.unlocked && (
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#10B981"
                      />
                    )}
                  </View>
                  <Text
                    style={[styles.achievementDesc, { color: theme.muted.val }]}
                    numberOfLines={1}
                  >
                    {item.desc}
                  </Text>
                  <Text
                    style={[
                      styles.achievementProgress,
                      { color: item.unlocked ? item.color : theme.muted.val },
                    ]}
                  >
                    {item.unlocked
                      ? "Đã đạt được"
                      : `Tiến độ: ${item.progress}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.themeCard,
            {
              backgroundColor: theme.surface.val,
              borderColor: theme.border.val,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.color.val }]}>
            Giao diện
          </Text>
          <Text style={[styles.themeDescription, { color: theme.muted.val }]}>
            Chọn chế độ hiển thị cho ứng dụng.
          </Text>
          <View style={styles.themeOptions}>
            {themeOptions.map((option) => {
              const selected = preference === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => void setPreference(option.value)}
                  style={[
                    styles.themeOption,
                    {
                      borderColor: selected
                        ? theme.primary.val
                        : theme.border.val,
                    },
                    selected && { backgroundColor: theme.primary.val },
                  ]}
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: selected ? "#FFFFFF" : theme.color.val },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={() => {
            void logout().then(() => router.replace("/auth"));
          }}
          style={[styles.logoutButton, { borderColor: theme.danger.val }]}
        >
          <Text style={[styles.logoutText, { color: theme.danger.val }]}>
            Đăng xuất
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0 },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  header: { gap: 4 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  profileCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  identityRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  identityCopy: { flex: 1, gap: 3 },
  avatar: {
    alignItems: "center",
    backgroundColor: "#FDE8D7",
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  avatarText: { color: "#9A4D19", fontSize: 22, fontWeight: "900" },
  avatarImage: { borderRadius: 26, height: 52, width: 52 },
  avatarEditBadge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.surface,
    borderRadius: 10,
    borderWidth: 2,
    bottom: -2,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 20,
  },
  avatarEditText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900", lineHeight: 17 },
  name: { color: colors.text, fontSize: 16, fontWeight: "900" },
  studentId: { color: colors.mutedText, fontSize: 12 },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: spacing.xs,
  },
  detailLabel: { color: colors.mutedText, fontSize: 11, fontWeight: "700" },
  detailValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    marginTop: -spacing.xs,
  },
  universityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  universityLogo: {
    width: 24,
    height: 24,
  },
  sectionHeading: { marginBottom: -spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  drlCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  drlHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  drlScoreWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  drlNumber: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  drlMax: {
    fontSize: 14,
    fontWeight: "700",
  },
  drlRankPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  drlRankBadge: {
    fontSize: 13,
  },
  drlRankText: {
    fontSize: 12,
    fontWeight: "800",
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  drlTargetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  drlTargetText: {
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
  drlRuleText: {
    fontSize: 11,
    fontWeight: "800",
  },
  achievementsTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 2,
  },
  achievementsGrid: {
    gap: 8,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  achievementIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  achievementTextWrap: {
    flex: 1,
    gap: 2,
  },
  achievementTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  achievementTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  achievementDesc: {
    fontSize: 11,
  },
  achievementProgress: {
    fontSize: 10.5,
    fontWeight: "800",
    marginTop: 1,
  },
  themeCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  themeDescription: { fontSize: 13 },
  themeOptions: { flexDirection: "row", gap: spacing.xs },
  themeOption: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  themeOptionText: { fontSize: 12, fontWeight: "800" },
  metrics: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    paddingVertical: spacing.md,
  },
  metric: { alignItems: "center", flex: 1, gap: 4 },
  metricDivider: { backgroundColor: colors.border, height: 34, width: 1 },
  metricValue: { color: colors.text, fontSize: 21, fontWeight: "900" },
  metricLabel: { color: colors.mutedText, fontSize: 12 },
  adminAccess: { borderRadius: 14, padding: 18, gap: 6 },
  adminAccessTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  adminAccessCaption: { color: "#FFFFFF", fontSize: 12 },
  logoutButton: {
    alignItems: "center",
    borderColor: colors.danger,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    marginTop: spacing.xs,
  },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: "800" },
  adminButton: { borderRadius: 16, gap: 4, padding: spacing.md },
  adminButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  adminButtonHint: { color: "rgba(255,255,255,0.82)", fontSize: 12 },
});
