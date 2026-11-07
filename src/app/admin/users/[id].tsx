import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@tamagui/core';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AdminButton, AdminConfirmDialog, AdminNotice, AdminPanel } from '@/components/admin/AdminWidgets';
import { Screen } from '@/components/Screen';
import { getAdminUser, getAdminUserError, setAdminUserStatus, updateAdminUserProfile } from '@/services/adminUserService';
import type { AuthUser } from '@/types/auth';

export default function AdminUserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [major, setMajor] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState(false);

  const loadUser = useCallback(async () => {
    if (!id) { setError('Mã tài khoản không hợp lệ.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const data = await getAdminUser(id);
      setUser(data); setName(data.name); setStudentId(data.studentId); setMajor(data.major);
    } catch (cause) { setError(getAdminUserError(cause)); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void loadUser(); }, [loadUser]);

  const save = async () => {
    if (!id || busy) return;
    setError(''); setNotice('');
    if (name.trim().length < 2 || name.trim().length > 120) { setError('Họ tên phải có 2–120 ký tự.'); return; }
    if (studentId.trim().length < 2 || studentId.trim().length > 32) { setError('Mã sinh viên phải có 2–32 ký tự.'); return; }
    if (major.trim().length < 2 || major.trim().length > 120) { setError('Ngành học phải có 2–120 ký tự.'); return; }
    setBusy(true);
    try {
      const updated = await updateAdminUserProfile(id, { name: name.trim(), studentId: studentId.trim().toUpperCase(), major: major.trim() });
      setUser(updated); setStudentId(updated.studentId); setNotice('Đã lưu hồ sơ thành công.');
    } catch (cause) { setError(getAdminUserError(cause)); }
    finally { setBusy(false); }
  };

  const changeStatus = async () => {
    if (!id || !user || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const next = user.status === 'active' ? 'suspended' : 'active';
      const updated = await setAdminUserStatus(id, next);
      setUser(updated); setNotice(next === 'active' ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.');
    } catch (cause) { setError(getAdminUserError(cause)); }
    finally { setConfirming(false); setBusy(false); }
  };

  return <Screen>
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" style={styles.back} onPress={() => router.replace('/admin/users')}><Ionicons name="arrow-back" color={theme.color.val} size={20} /><Text style={{ color: theme.color.val, fontWeight: '800' }}>Danh sách tài khoản</Text></Pressable>
        <Text style={[styles.title, { color: theme.color.val }]}>Hồ sơ sinh viên</Text>
        {loading ? <ActivityIndicator size="large" color={theme.primary.val} style={styles.loader} /> : !user ? <AdminPanel><AdminNotice>{error || 'Không tìm thấy tài khoản.'}</AdminNotice><AdminButton label="Thử lại" onPress={() => void loadUser()} /></AdminPanel> :
          <AdminPanel>
            <Text style={[styles.section, { color: theme.color.val }]}>Thông tin tài khoản</Text>
            <Text style={[styles.readonly, { color: theme.muted.val }]}>Email: {user.email}</Text>
            <Text style={[styles.readonly, { color: theme.muted.val }]}>Vai trò: {user.role === 'admin' ? 'Quản trị viên' : 'Sinh viên'} (chỉ đọc)</Text>
            <Text style={[styles.readonly, { color: theme.muted.val }]}>Trạng thái: {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}</Text>
            <Text style={[styles.hint, { color: theme.muted.val }]}>Không hiển thị mật khẩu và không cho phép thay đổi vai trò admin.</Text>
            {([
              { label: 'Họ và tên *', value: name, onChange: setName },
              { label: 'Mã sinh viên *', value: studentId, onChange: setStudentId },
              { label: 'Ngành học *', value: major, onChange: setMajor },
            ]).map(field => <View key={field.label} style={styles.field}><Text style={[styles.label, { color: theme.color.val }]}>{field.label}</Text><TextInput accessibilityLabel={field.label} editable={!busy} value={field.value} onChangeText={field.onChange} style={[styles.input, { color: theme.color.val, backgroundColor: theme.background.val, borderColor: theme.border.val }]} /></View>)}
            {error ? <AdminNotice>{error}</AdminNotice> : null}
            {notice ? <AdminNotice kind="success">{notice}</AdminNotice> : null}
            <View style={styles.actions}><AdminButton label="Lưu hồ sơ" icon="save-outline" busy={busy} onPress={() => void save()} /><AdminButton label={user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'} variant={user.status === 'active' ? 'danger' : 'secondary'} disabled={busy} onPress={() => setConfirming(true)} /></View>
          </AdminPanel>}
      </ScrollView>
    </KeyboardAvoidingView>
    <AdminConfirmDialog visible={confirming} title={user?.status === 'active' ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'} message={`Xác nhận ${user?.status === 'active' ? 'khóa' : 'mở khóa'} tài khoản “${user?.name ?? ''}”?`} confirmLabel={user?.status === 'active' ? 'Khóa' : 'Mở khóa'} danger={user?.status === 'active'} busy={busy} onCancel={() => setConfirming(false)} onConfirm={() => void changeStatus()} />
  </Screen>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 }, page: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: 14, paddingBottom: 40 },
  back: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 8, alignSelf: 'flex-start' },
  title: { fontSize: 25, fontWeight: '900' }, section: { fontSize: 17, fontWeight: '900' },
  readonly: { fontSize: 13 }, hint: { fontSize: 12, lineHeight: 19 },
  field: { gap: 6 }, label: { fontSize: 13, fontWeight: '800' },
  input: { borderWidth: 1, minHeight: 45, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  loader: { marginTop: 30 }, actions: { flexDirection: 'row', gap: 9, flexWrap: 'wrap', paddingTop: 6 },
});
