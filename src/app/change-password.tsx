import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@tamagui/core';

import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/apiClient';

export default function ChangePasswordScreen() {
  const { user, mode, changePassword } = useAuth();
  const theme = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setMessage('');
    if (newPassword.length < 8 || newPassword.length > 128) {
      setError('Mật khẩu mới cần có từ 8 đến 128 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận chưa khớp.');
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage(mode === 'remote' ? 'Đổi mật khẩu thành công. Các phiên đăng nhập cũ đã bị thu hồi.' : 'Đổi mật khẩu demo thành công trên thiết bị này.');
    } catch (cause) {
      const code = cause instanceof ApiError ? cause.code : cause instanceof Error ? cause.message : '';
      const known: Record<string, string> = {
        CURRENT_PASSWORD_INVALID: 'Mật khẩu hiện tại chưa chính xác.',
        SAME_PASSWORD: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
        DEMO_ADMIN_PASSWORD_FIXED: 'Mật khẩu admin demo được cố định để thử nghiệm và không thể đổi.',
        SESSION_REVOKED: 'Phiên đã hết hạn. Hãy đăng nhập lại rồi thử lại.',
      };
      setError(known[code] ?? (cause instanceof ApiError ? cause.message : 'Không thể đổi mật khẩu. Hãy thử lại.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()}><Text style={[styles.back, { color: theme.primary.val }]}>‹  Hồ sơ</Text></Pressable>
          <Text style={[styles.eyebrow, { color: theme.primary.val }]}>BẢO MẬT TÀI KHOẢN</Text>
          <Text style={[styles.title, { color: theme.color.val }]}>Đổi mật khẩu</Text>
          <Text style={[styles.copy, { color: theme.muted.val }]}>{user?.email}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
            <Field label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoComplete="current-password" />
            <Field label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoComplete="new-password" />
            <Field label="Nhập lại mật khẩu mới" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" />
            <Text style={[styles.hint, { color: theme.muted.val }]}>Mật khẩu mới phải có ít nhất 8 ký tự.</Text>
            {message ? <Text accessibilityRole="alert" style={[styles.message, { color: theme.primary.val }]}>{message}</Text> : null}
            {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger.val }]}>{error}</Text> : null}
            <Pressable disabled={busy} onPress={() => void submit()} style={[styles.button, { backgroundColor: theme.primary.val }, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cập nhật mật khẩu</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; secureTextEntry?: boolean; autoComplete?: 'current-password' | 'new-password' }) {
  const theme = useTheme();
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={[styles.label, { color: theme.muted.val }]}>{label}</Text><TextInput {...inputProps} style={[styles.input, { backgroundColor: theme.background.val, color: theme.color.val, borderColor: theme.border.val }]} placeholderTextColor={theme.muted.val} /></View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', gap: 14, padding: 20, paddingBottom: 32 },
  back: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '900' },
  copy: { fontSize: 14, marginBottom: 6 },
  card: { borderWidth: 1, borderRadius: 20, gap: 14, padding: 18 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, fontSize: 15, minHeight: 48, paddingHorizontal: 13 },
  hint: { fontSize: 12 },
  button: { alignItems: 'center', borderRadius: 13, justifyContent: 'center', minHeight: 50, paddingHorizontal: 16 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.65 },
  message: { fontSize: 13, lineHeight: 19 },
  error: { fontSize: 13, lineHeight: 19 },
});
