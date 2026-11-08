import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { appMode, appModeConfigError, type AppMode } from '@/constants/app-mode';
import { useAppState } from '@/context/AppStateContext';
import {
  completeGetStarted,
  changeDemoPassword,
  getAuthSession,
  hasCompletedGetStarted,
  loginDemoAccount,
  logoutDemoAccount,
  registerDemoAccount,
} from '@/services/authService';
import { ApiError, setUnauthorizedHandler } from '@/services/apiClient';
import {
  getRemoteAuthSession,
  loginRemoteAccount,
  logoutRemoteAccount,
  changeRemotePassword,
  requestRemotePasswordReset,
  resetRemotePassword,
  registerRemoteAccount,
} from '@/services/remoteAuthService';
import type { AuthUser, RegisterInput } from '@/types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  mode: AppMode;
  isReady: boolean;
  startupError: string | null;
  hasSeenGetStarted: boolean;
  register: (input: RegisterInput) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ message: string }>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<{ message: string }>;
  retryRestoreSession: () => Promise<void>;
  finishGetStarted: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const { setUser } = useAppState();
  const [user, setCurrentUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [hasSeenGetStarted, setHasSeenGetStarted] = useState(false);

  useEffect(() => setUnauthorizedHandler(() => {
    if (appMode !== 'remote') return;
    setCurrentUser(null);
    setUser(null);
    setStartupError('SESSION_EXPIRED');
    void logoutRemoteAccount().catch(() => undefined);
  }), [setUser]);

  const restoreSession = useCallback(async () => {
    setIsReady(false);
    setStartupError(null);

    try {
      if (appModeConfigError) {
        throw new ApiError('INVALID_APP_MODE', 'EXPO_PUBLIC_APP_MODE chỉ nhận demo hoặc remote.');
      }

      const completed = await hasCompletedGetStarted().catch(() => false);
      const session = appMode === 'demo'
        ? await getAuthSession()
        : await getRemoteAuthSession();

      setCurrentUser(session);
      setUser(session);
      setHasSeenGetStarted(completed);
    } catch (error) {
      setCurrentUser(null);
      setUser(null);
      setStartupError(error instanceof ApiError ? error.code : 'SESSION_RESTORE_FAILED');
    } finally {
      setIsReady(true);
    }
  }, [setUser]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const assertModeConfigured = useCallback(() => {
    if (appModeConfigError) {
      throw new ApiError('INVALID_APP_MODE', 'EXPO_PUBLIC_APP_MODE chỉ nhận demo hoặc remote.');
    }
  }, []);

  const acceptUser = useCallback((nextUser: AuthUser) => {
    setStartupError(null);
    setCurrentUser(nextUser);
    setUser(nextUser);
  }, [setUser]);

  const register = useCallback(async (input: RegisterInput) => {
    assertModeConfigured();
    const nextUser = appMode === 'demo'
      ? await registerDemoAccount(input)
      : await registerRemoteAccount(input);
    acceptUser(nextUser);
  }, [acceptUser, assertModeConfigured]);

  const login = useCallback(async (email: string, password: string) => {
    assertModeConfigured();
    const nextUser = appMode === 'demo'
      ? await loginDemoAccount(email, password)
      : await loginRemoteAccount(email, password);
    acceptUser(nextUser);
  }, [acceptUser, assertModeConfigured]);

  const logout = useCallback(async () => {
    try {
      if (appMode === 'demo') await logoutDemoAccount();
      else await logoutRemoteAccount();
    } finally {
      setCurrentUser(null);
      setUser(null);
    }
  }, [setUser]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) throw new ApiError('UNAUTHORIZED', 'Vui lòng đăng nhập lại.');
    const nextUser = appMode === 'demo'
      ? (await changeDemoPassword(user.email, currentPassword, newPassword), user)
      : await changeRemotePassword(currentPassword, newPassword);
    acceptUser(nextUser);
  }, [acceptUser, user]);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (appMode !== 'remote') {
      throw new ApiError('PASSWORD_RESET_DEMO_UNAVAILABLE', 'Khôi phục qua email chỉ hoạt động với tài khoản remote.');
    }
    return requestRemotePasswordReset(email);
  }, []);

  const resetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    if (appMode !== 'remote') {
      throw new ApiError('PASSWORD_RESET_DEMO_UNAVAILABLE', 'Khôi phục qua email chỉ hoạt động với tài khoản remote.');
    }
    return resetRemotePassword(email, code, newPassword);
  }, []);

  const finishGetStarted = useCallback(async () => {
    await completeGetStarted();
    setHasSeenGetStarted(true);
  }, []);

  const value = useMemo(() => ({
    user,
    mode: appMode,
    isReady,
    startupError,
    hasSeenGetStarted,
    register,
    login,
    logout,
    changePassword,
    requestPasswordReset,
    resetPassword,
    retryRestoreSession: restoreSession,
    finishGetStarted,
  }), [user, isReady, startupError, hasSeenGetStarted, register, login, logout, changePassword, requestPasswordReset, resetPassword, restoreSession, finishGetStarted]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
