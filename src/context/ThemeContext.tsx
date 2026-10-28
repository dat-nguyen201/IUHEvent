import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { getStoredValue, setStoredValue } from '@/services/authStorage';

const THEME_PREFERENCE_KEY = 'iuh-event-theme-preference';

export type ThemePreference = 'system' | 'light' | 'dark';
export type AppColorScheme = 'light' | 'dark';

type ThemeContextValue = {
  preference: ThemePreference;
  colorScheme: AppColorScheme;
  isReady: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    void getStoredValue(THEME_PREFERENCE_KEY)
      .then((storedPreference) => {
        if (active && isThemePreference(storedPreference)) setPreferenceState(storedPreference);
      })
      .catch((error: unknown) => {
        console.warn('Không thể tải tùy chọn giao diện:', error);
      })
      .finally(() => {
        if (active) setIsReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    preference,
    colorScheme: preference === 'system'
      ? (systemScheme === 'dark' ? 'dark' : 'light')
      : preference,
    isReady,
    setPreference: async (nextPreference) => {
      setPreferenceState(nextPreference);
      try {
        await setStoredValue(THEME_PREFERENCE_KEY, nextPreference);
      } catch (error: unknown) {
        console.warn('Không thể lưu tùy chọn giao diện:', error);
      }
    },
  }), [isReady, preference, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme phải được dùng trong ThemeProvider');
  return context;
}
