import { router, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { ApiError } from '@/services/apiClient';
import { getSafeEventRedirect } from '@/utils/event-links';
import { useTheme } from '@tamagui/core';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const { redirect: redirectParam } = useLocalSearchParams<{ redirect?: string | string[] }>();
  const { login, register, hasSeenGetStarted, mode: appMode, startupError, retryRestoreSession } = useAuth();
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
    const isDemoPrivilegedLogin =
      appMode === 'demo' &&
      mode === 'login' &&
      (normalizedEmail.toLowerCase() === 'admin' || normalizedEmail.toLowerCase() === 'organizer');
    if (!isDemoPrivilegedLogin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
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
      const serverMessage = cause instanceof ApiError ? cause.message : undefined;
      setError(getAuthErrorMessage(code, appMode, mode, serverMessage));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <View style={styles.brandLogoWrap}>
              <Image
                source={require('@/IMG/logo.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </View>
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
            {startupError ? (
              <View style={styles.startupError}>
                <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger.val }]}>
                  {getAuthErrorMessage(startupError, appMode, 'login')}
                </Text>
                {appMode === 'remote' && startupError !== 'INVALID_APP_MODE' ? (
                  <Pressable
                    disabled={busy}
                    onPress={async () => {
                      setBusy(true);
                      try {
                        await retryRestoreSession();
                      } finally {
                        setBusy(false);
                      }
                    }}
                    style={styles.retryButton}
                  >
                    <Text style={[styles.retryText, { color: theme.primary.val }]}>Thử kết nối lại</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
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
              label={mode === 'login' && appMode === 'demo' ? 'Email hoặc tài khoản' : mode === 'login' ? 'Email' : 'Email sinh viên'}
              value={email}
              onChangeText={setEmail}
              placeholder={mode === 'login' && appMode === 'demo' ? 'email@iuh.edu.vn hoặc admin' : 'email@iuh.edu.vn'}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field label="Mật khẩu" value={password} onChangeText={setPassword} placeholder="Tối thiểu 8 ký tự" secureTextEntry={!showPassword} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            {mode === 'register' ? <Field label="Nhập lại mật khẩu" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Nhập lại mật khẩu" secureTextEntry={!showPassword} /> : null}

            <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.visibilityButton}>
              <Text style={[styles.visibilityText, { color: theme.primary.val }]}>{showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</Text>
            </Pressable>
            {appMode === 'remote' && mode === 'login' ? (
              <Pressable onPress={() => router.push('/forgot-password' as never)} style={styles.forgotButton}>
                <Text style={[styles.visibilityText, { color: theme.primary.val }]}>Quên mật khẩu?</Text>
              </Pressable>
            ) : null}
            {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger.val }]}>{error}</Text> : null}

            <Pressable disabled={busy} onPress={submit} style={[styles.primaryButton, busy && styles.disabledButton]}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</Text>}
            </Pressable>
            {appMode === 'demo' && mode === 'login' ? <Text style={[styles.adminHint, { color: theme.primary.val }]}>Tài khoản admin dùng thử: admin / 123456789</Text> : null}
            <Text style={[styles.disclaimer, { color: theme.muted.val }]}>
              {appMode === 'demo'
                ? 'Tài khoản demo được lưu trên thiết bị này. Đây chưa phải dịch vụ xác thực chính thức.'
                : 'Tài khoản được xác thực qua máy chủ IUH Event.'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function getAuthErrorMessage(
  code: string,
  appMode: 'demo' | 'remote',
  authMode: AuthMode,
  serverMessage?: string,
) {
  switch (code) {
    case 'EMAIL_EXISTS':
      return appMode === 'demo'
        ? 'Email này đã được đăng ký trên thiết bị.'
        : 'Email này đã được đăng ký.';
    case 'STUDENT_ID_EXISTS':
      return 'Mã sinh viên này đã được đăng ký.';
    case 'INVALID_CREDENTIALS':
    case 'UNAUTHORIZED':
      return 'Email hoặc mật khẩu chưa chính xác.';
    case 'SESSION_EXPIRED':
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 'ACCOUNT_SUSPENDED':
      return 'Tài khoản đang bị khóa. Hãy liên hệ quản trị viên.';
    case 'API_CONFIG_MISSING':
      return 'Chưa cấu hình API. Hãy kiểm tra EXPO_PUBLIC_API_URL.';
    case 'INVALID_APP_MODE':
      return 'EXPO_PUBLIC_APP_MODE phải là demo hoặc remote.';
    case 'REQUEST_TIMEOUT':
    case 'NETWORK_ERROR':
      return 'Không kết nối được máy chủ. Hãy kiểm tra mạng và thử lại.';
    case 'FORBIDDEN':
      return 'Tài khoản không có quyền thực hiện thao tác này.';
    default:
      if (serverMessage) return serverMessage;
      return authMode === 'login'
        ? 'Không thể đăng nhập. Hãy kiểm tra thông tin hoặc thử lại.'
        : 'Chưa thể tạo tài khoản. Hãy thử lại.';
  }
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
  brandLogoWrap: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  brandLogo: { width: 42, height: 42 },
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
  forgotButton: { alignSelf: 'flex-end', paddingVertical: 2 },
  visibilityText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  startupError: { gap: spacing.xs },
  retryButton: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  retryText: { fontSize: 13, fontWeight: '700' },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 13, justifyContent: 'center', minHeight: 52, marginTop: spacing.xs },
  disabledButton: { opacity: 0.65 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disclaimer: { color: colors.mutedText, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  adminHint: { color: colors.primary, fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
