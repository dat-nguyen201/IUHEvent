import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/app-theme';
import { useAppState } from '@/context/AppStateContext';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme, type ThemePreference } from '@/context/ThemeContext';
import { useTheme } from '@tamagui/core';

export default function ProfileScreen() {
  const { user, savedEventIds, checkedInEventIds } = useAppState();
  const { logout } = useAuth();
  const theme = useTheme();
  const { preference, setPreference } = useAppTheme();

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: 'Theo thiết bị' },
    { value: 'light', label: 'Sáng' },
    { value: 'dark', label: 'Tối' },
  ];

  return (
    <Screen>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.primary.val }]}>TÀI KHOẢN IUH</Text>
          <Text style={[styles.title, { color: theme.color.val }]}>Hồ sơ của tôi</Text>
        </View>

        <View style={[styles.profileCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
          <View style={styles.identityRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name.charAt(0) ?? 'S'}</Text></View>
            <View style={styles.identityCopy}>
              <Text style={[styles.name, { color: theme.color.val }]}>{user?.name ?? 'Sinh viên IUH'}</Text>
              <Text style={[styles.studentId, { color: theme.muted.val }]}>{user?.studentId}</Text>
            </View>
            <Badge label={user?.id === 'admin' ? 'Admin demo' : 'Sinh viên'} tone="success" />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border.val }]} />
          <Text style={[styles.detailLabel, { color: theme.muted.val }]}>Email</Text>
          <Text style={[styles.detailValue, { color: theme.color.val }]}>{user?.email}</Text>
          <Text style={[styles.detailLabel, { color: theme.muted.val }]}>Đơn vị</Text>
          <Text style={[styles.detailValue, { color: theme.color.val }]}>Trường Đại học Công nghiệp TP.HCM</Text>
        </View>

        <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: theme.color.val }]}>Hoạt động của bạn</Text></View>
        <View style={[styles.metrics, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: theme.color.val }]}>{savedEventIds.length}</Text>
            <Text style={[styles.metricLabel, { color: theme.muted.val }]}>Sự kiện đã lưu</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: theme.border.val }]} />
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: theme.color.val }]}>{checkedInEventIds.length}</Text>
            <Text style={[styles.metricLabel, { color: theme.muted.val }]}>Lần check-in</Text>
          </View>
        </View>

        <View style={[styles.themeCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
          <Text style={[styles.sectionTitle, { color: theme.color.val }]}>Giao diện</Text>
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
                    { borderColor: selected ? theme.primary.val : theme.border.val },
                    selected && { backgroundColor: theme.primary.val },
                  ]}>
                  <Text style={[styles.themeOptionText, { color: selected ? '#FFFFFF' : theme.color.val }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable onPress={() => { void logout().then(() => router.replace('/auth')); }} style={[styles.logoutButton, { borderColor: theme.danger.val }]}>
          <Text style={[styles.logoutText, { color: theme.danger.val }]}>Đăng xuất</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0 },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  header: { gap: 4 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  title: { color: colors.text, fontSize: 26, fontWeight: '900' },
  profileCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  identityRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  identityCopy: { flex: 1, gap: 3 },
  avatar: { alignItems: 'center', backgroundColor: '#FDE8D7', borderRadius: 26, height: 52, justifyContent: 'center', width: 52 },
  avatarText: { color: '#9A4D19', fontSize: 22, fontWeight: '900' },
  name: { color: colors.text, fontSize: 16, fontWeight: '900' },
  studentId: { color: colors.mutedText, fontSize: 12 },
  divider: { backgroundColor: colors.border, height: 1, marginVertical: spacing.xs },
  detailLabel: { color: colors.mutedText, fontSize: 11, fontWeight: '700' },
  detailValue: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: -spacing.xs },
  sectionHeading: { marginBottom: -spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  themeCard: { borderRadius: 16, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  themeDescription: { fontSize: 13 },
  themeOptions: { flexDirection: 'row', gap: spacing.xs },
  themeOption: { alignItems: 'center', borderRadius: 10, borderWidth: 1, flex: 1, minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.xs },
  themeOptionText: { fontSize: 12, fontWeight: '800' },
  metrics: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', paddingVertical: spacing.md },
  metric: { alignItems: 'center', flex: 1, gap: 4 },
  metricDivider: { backgroundColor: colors.border, height: 34, width: 1 },
  metricValue: { color: colors.text, fontSize: 21, fontWeight: '900' },
  metricLabel: { color: colors.mutedText, fontSize: 12 },
  logoutButton: { alignItems: 'center', borderColor: colors.danger, borderRadius: 13, borderWidth: 1, justifyContent: 'center', minHeight: 48, marginTop: spacing.xs },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
});
