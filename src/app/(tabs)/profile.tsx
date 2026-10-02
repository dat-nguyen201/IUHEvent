import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/app-theme';
import { useAppState } from '@/context/AppStateContext';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { user, savedEventIds, checkedInEventIds } = useAppState();
  const { logout } = useAuth();

  return (
    <Screen>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>TÀI KHOẢN IUH</Text>
          <Text style={styles.title}>Hồ sơ của tôi</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.identityRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name.charAt(0) ?? 'S'}</Text></View>
            <View style={styles.identityCopy}>
              <Text style={styles.name}>{user?.name ?? 'Sinh viên IUH'}</Text>
              <Text style={styles.studentId}>{user?.studentId}</Text>
            </View>
            <Badge label={user?.id === 'admin' ? 'Admin demo' : 'Sinh viên'} tone="success" />
          </View>
          <View style={styles.divider} />
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{user?.email}</Text>
          <Text style={styles.detailLabel}>Đơn vị</Text>
          <Text style={styles.detailValue}>Trường Đại học Công nghiệp TP.HCM</Text>
        </View>

        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Hoạt động của bạn</Text></View>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{savedEventIds.length}</Text>
            <Text style={styles.metricLabel}>Sự kiện đã lưu</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{checkedInEventIds.length}</Text>
            <Text style={styles.metricLabel}>Lần check-in</Text>
          </View>
        </View>

        <Pressable onPress={() => { void logout().then(() => router.replace('/auth')); }} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
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
  metrics: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', paddingVertical: spacing.md },
  metric: { alignItems: 'center', flex: 1, gap: 4 },
  metricDivider: { backgroundColor: colors.border, height: 34, width: 1 },
  metricValue: { color: colors.text, fontSize: 21, fontWeight: '900' },
  metricLabel: { color: colors.mutedText, fontSize: 12 },
  logoutButton: { alignItems: 'center', borderColor: colors.danger, borderRadius: 13, borderWidth: 1, justifyContent: 'center', minHeight: 48, marginTop: spacing.xs },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
});
