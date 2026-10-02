import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAppState } from '@/context/AppStateContext';
import {
  completeGetStarted,
  getAuthSession,
  hasCompletedGetStarted,
  loginDemoAccount,
  logoutDemoAccount,
  registerDemoAccount,
  type DemoUser,
} from '@/services/authService';

type RegisterInput = { name: string; studentId: string; email: string; password: string };
type AuthContextValue = {
  user: DemoUser | null;
  isReady: boolean;
  hasSeenGetStarted: boolean;
  register: (input: RegisterInput) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  finishGetStarted: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const { setUser } = useAppState();
  const [user, setCurrentUser] = useState<DemoUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasSeenGetStarted, setHasSeenGetStarted] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getAuthSession(), hasCompletedGetStarted()]).then(([session, completed]) => {
      if (!active) return;
      setCurrentUser(session);
      setUser(session);
      setHasSeenGetStarted(completed);
      setIsReady(true);
    }).catch(() => {
      if (active) setIsReady(true);
    });
    return () => {
      active = false;
    };
  }, [setUser]);

  const acceptUser = useCallback((nextUser: DemoUser) => {
    setCurrentUser(nextUser);
    setUser(nextUser);
  }, [setUser]);

  const register = useCallback(async (input: RegisterInput) => {
    acceptUser(await registerDemoAccount(input));
  }, [acceptUser]);

  const login = useCallback(async (email: string, password: string) => {
    acceptUser(await loginDemoAccount(email, password));
  }, [acceptUser]);

  const logout = useCallback(async () => {
    await logoutDemoAccount();
    setCurrentUser(null);
    setUser(null);
  }, [setUser]);

  const finishGetStarted = useCallback(async () => {
    await completeGetStarted();
    setHasSeenGetStarted(true);
  }, []);

  const value = useMemo(() => ({
    user,
    isReady,
    hasSeenGetStarted,
    register,
    login,
    logout,
    finishGetStarted,
  }), [user, isReady, hasSeenGetStarted, register, login, logout, finishGetStarted]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
