import { router, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/constants/app-theme';
import { getSafeEventRedirect } from '@/utils/event-links';
import { useTheme } from '@tamagui/core';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const { redirect: redirectParam } = useLocalSearchParams<{ redirect?: string | string[] }>();
  const { login, register, hasSeenGetStarted } = useAuth();
  const theme = useTheme();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    const normalizedEmail = email.trim();
    const isAdminLogin = mode === 'login' && normalizedEmail.toLowerCase() === 'admin';
    if (!isAdminLogin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu cần có ít nhất 8 ký tự.');
      return;
    }
    if (mode === 'register') {
      if (!name.trim() || !studentId.trim()) {
        setError('Vui lòng nhập họ tên và mã sinh viên.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận chưa khớp.');
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'register') await register({ name, studentId, email: normalizedEmail, password });
      else await login(normalizedEmail, password);
      const redirect = getSafeEventRedirect(redirectParam);
      if (redirect && hasSeenGetStarted) router.replace(redirect);
      else if (redirect) {
        const redirectPath = Array.isArray(redirectParam) ? redirectParam[0] : redirectParam;
        router.replace({ pathname: '/get-started', params: { redirect: redirectPath } });
      } else router.replace(hasSeenGetStarted ? '/(tabs)' : '/get-started');
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : '';
      setError(code === 'EMAIL_EXISTS'
        ? 'Email này đã được đăng ký trên thiết bị.'
        : mode === 'login'
          ? 'Email hoặc mật khẩu chưa chính xác.'
          : 'Chưa thể tạo tài khoản. Hãy thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>IUH</Text></View>
            <View>
              <Text style={[styles.eyebrow, { color: theme.primary.val }]}>IUH EVENT</Text>
              <Text style={[styles.brandTitle, { color: theme.color.val }]}>Đồng hành sự kiện sinh viên</Text>
            </View>
          </View>

          <View style={styles.intro}>
            <Text style={[styles.title, { color: theme.color.val }]}>{mode === 'login' ? 'Chào mừng bạn trở lại' : 'Tạo tài khoản'}</Text>
            <Text style={[styles.subtitle, { color: theme.muted.val }]}>
              {mode === 'login' ? 'Đăng nhập để theo dõi sự kiện và lịch cá nhân.' : 'Bắt đầu kết nối với các hoạt động tại IUH.'}
            </Text>
          </View>

          <View style={[styles.form, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
            <View style={styles.segment}>
              <Pressable onPress={() => { setMode('login'); setError(''); }} style={[styles.segmentButton, mode === 'login' && { backgroundColor: theme.primary.val }]}>
                <Text style={[styles.segmentText, { color: mode === 'login' ? '#FFFFFF' : theme.muted.val }]}>Đăng nhập</Text>
              </Pressable>
              <Pressable onPress={() => { setMode('register'); setError(''); }} style={[styles.segmentButton, mode === 'register' && { backgroundColor: theme.primary.val }]}>
                <Text style={[styles.segmentText, { color: mode === 'register' ? '#FFFFFF' : theme.muted.val }]}>Đăng ký</Text>
              </Pressable>
            </View>

            {mode === 'register' ? <>
              <Field label="Họ và tên" value={name} onChangeText={setName} placeholder="Nguyễn Văn An" autoComplete="name" />
              <Field label="Mã sinh viên" value={studentId} onChangeText={setStudentId} placeholder="2000000000" autoCapitalize="characters" />
            </> : null}
            <Field
              label={mode === 'login' ? 'Email hoặc tài khoản' : 'Email sinh viên'}
              value={email}
              onChangeText={setEmail}
              placeholder={mode === 'login' ? 'email@iuh.edu.vn hoặc admin' : 'email@iuh.edu.vn'}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field label="Mật khẩu" value={password} onChangeText={setPassword} placeholder="Tối thiểu 8 ký tự" secureTextEntry={!showPassword} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            {mode === 'register' ? <Field label="Nhập lại mật khẩu" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Nhập lại mật khẩu" secureTextEntry={!showPassword} /> : null}

            <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.visibilityButton}>
              <Text style={[styles.visibilityText, { color: theme.primary.val }]}>{showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</Text>
            </Pressable>
            {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger.val }]}>{error}</Text> : null}

            <Pressable disabled={busy} onPress={submit} style={[styles.primaryButton, busy && styles.disabledButton]}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</Text>}
            </Pressable>
            {mode === 'login' ? <Text style={[styles.adminHint, { color: theme.primary.val }]}>Tài khoản admin dùng thử: admin / 123456789</Text> : null}
            <Text style={[styles.disclaimer, { color: theme.muted.val }]}>Tài khoản demo được lưu trên thiết bị này. Đây chưa phải dịch vụ xác thực chính thức.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

type FieldProps = ComponentProps<typeof TextInput> & { label: string };

function Field({ label, style, ...props }: FieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: theme.muted.val }]}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={theme.muted.val}
        selectionColor={theme.primary.val}
        cursorColor={theme.primary.val}
        style={[styles.input, { color: theme.color.val, borderColor: theme.border.val }, style]}
        returnKeyType="next"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1, gap: spacing.xl, paddingBottom: spacing.lg },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  brandMark: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, height: 48, justifyContent: 'center', width: 48 },
  brandMarkText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  brandTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 2 },
  intro: { gap: spacing.xs, marginTop: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  subtitle: { color: colors.mutedText, fontSize: 15, lineHeight: 22 },
  form: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  segment: { backgroundColor: colors.background, borderRadius: 14, flexDirection: 'row', padding: 4 },
  segmentButton: { alignItems: 'center', borderRadius: 11, flex: 1, minHeight: 44, justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.text },
  segmentText: { color: colors.mutedText, fontSize: 14, fontWeight: '700' },
  segmentTextActive: { color: '#FFFFFF' },
  fieldWrap: { gap: spacing.xs },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 50, paddingHorizontal: spacing.md },
  visibilityButton: { alignSelf: 'flex-end', paddingVertical: 2 },
  visibilityText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 13, justifyContent: 'center', minHeight: 52, marginTop: spacing.xs },
  disabledButton: { opacity: 0.65 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disclaimer: { color: colors.mutedText, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  adminHint: { color: colors.primary, fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
