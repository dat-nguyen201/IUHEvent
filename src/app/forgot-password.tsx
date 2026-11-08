import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@tamagui/core';

import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/apiClient';

export default function ForgotPasswordScreen() {
  const { mode, requestPasswordReset, resetPassword } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const requestCode = async () => {
    setError('');
    setMessage('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }
    setBusy(true);
    try {
      const result = await requestPasswordReset(email);
      setCodeRequested(true);
      setMessage(result.message);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Chưa thể gửi mã khôi phục. Hãy thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    setError('');
    setMessage('');
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Mã xác nhận phải gồm 6 chữ số.');
      return;
    }
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
      const result = await resetPassword(email, code, newPassword);
      setComplete(true);
      setMessage(result.message);
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : null;
      setError(apiError?.message ?? 'Không thể đặt lại mật khẩu. Hãy thử lại.');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'demo') {
    return (
      <Screen>
        <View style={styles.container}>
          <Text style={[styles.title, { color: theme.color.val }]}>Khôi phục mật khẩu</Text>
          <Text style={[styles.copy, { color: theme.muted.val }]}>Tài khoản demo được lưu riêng trên thiết bị và không có xác minh email. Chuyển sang chế độ remote để khôi phục qua email.</Text>
          <Pressable onPress={() => router.replace('/auth')} style={[styles.button, { backgroundColor: theme.primary.val }]}>
            <Text style={styles.buttonText}>Quay lại đăng nhập</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.replace('/auth')}><Text style={[styles.back, { color: theme.primary.val }]}>‹  Đăng nhập</Text></Pressable>
          <Text style={[styles.eyebrow, { color: theme.primary.val }]}>IUH EVENT · TÀI KHOẢN</Text>
          <Text style={[styles.title, { color: theme.color.val }]}>{complete ? 'Đã cập nhật mật khẩu' : 'Quên mật khẩu?'}</Text>
          <Text style={[styles.copy, { color: theme.muted.val }]}>
            {complete ? 'Bạn có thể đăng nhập bằng mật khẩu mới.' : 'Nhập email tài khoản để nhận mã xác nhận đặt lại mật khẩu. Mã có hiệu lực trong 10 phút.'}
          </Text>

          {!complete ? <View style={[styles.card, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
            <Field label="Email tài khoản" value={email} onChangeText={setEmail} editable={!codeRequested} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            {codeRequested ? <>
              <Field label="Mã xác nhận 6 chữ số" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
              <Field label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoComplete="new-password" />
              <Field label="Nhập lại mật khẩu mới" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" />
            </> : null}
            {message ? <Text accessibilityRole="alert" style={[styles.message, { color: theme.primary.val }]}>{message}</Text> : null}
            {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger.val }]}>{error}</Text> : null}
            <Pressable disabled={busy} onPress={() => void (codeRequested ? submitReset() : requestCode())} style={[styles.button, { backgroundColor: theme.primary.val }, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{codeRequested ? 'Đặt lại mật khẩu' : 'Gửi mã xác nhận'}</Text>}
            </Pressable>
            {codeRequested ? <Pressable disabled={busy} onPress={() => void requestCode()} style={styles.resend}><Text style={[styles.resendText, { color: theme.primary.val }]}>Gửi mã mới</Text></Pressable> : null}
          </View> : <Pressable onPress={() => router.replace('/auth')} style={[styles.button, { backgroundColor: theme.primary.val }]}><Text style={styles.buttonText}>Đến đăng nhập</Text></Pressable>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; editable?: boolean; keyboardType?: 'email-address' | 'number-pad'; autoCapitalize?: 'none'; autoComplete?: 'email' | 'new-password'; secureTextEntry?: boolean; maxLength?: number }) {
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
  copy: { fontSize: 14, lineHeight: 21, marginBottom: 6 },
  card: { borderWidth: 1, borderRadius: 20, gap: 14, padding: 18 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, fontSize: 15, minHeight: 48, paddingHorizontal: 13 },
  button: { alignItems: 'center', borderRadius: 13, justifyContent: 'center', minHeight: 50, paddingHorizontal: 16 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.65 },
  message: { fontSize: 13, lineHeight: 19 },
  error: { fontSize: 13, lineHeight: 19 },
  resend: { alignSelf: 'center', paddingVertical: 5 },
  resendText: { fontSize: 13, fontWeight: '800' },
});
