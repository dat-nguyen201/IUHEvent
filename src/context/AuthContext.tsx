import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { appMode, appModeConfigError, type AppMode } from '@/constants/app-mode';
import { useAppState } from '@/context/AppStateContext';
import {
  completeGetStarted,
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
    retryRestoreSession: restoreSession,
    finishGetStarted,
  }), [user, isReady, startupError, hasSeenGetStarted, register, login, logout, restoreSession, finishGetStarted]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
