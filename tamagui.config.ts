import { defaultConfig } from '@tamagui/config/v6';
import { createTamagui } from '@tamagui/core';

const tokens = {
  ...defaultConfig.tokens,
  space: {
    ...defaultConfig.tokens.space,
    appXs: 8,
    appSm: 12,
    appMd: 16,
    appLg: 24,
    appXl: 32,
  },
  radius: {
    ...defaultConfig.tokens.radius,
    card: 20,
    control: 16,
    pill: 999,
  },
  color: {
    ...defaultConfig.tokens.color,
    appBackground: '#050505',
    appSurface: 'rgba(255, 255, 255, 0.05)',
    appBorder: 'rgba(255, 255, 255, 0.1)',
    appMuted: '#9CA3AF',
    appPrimary: '#EF4444',
    appSuccess: '#10B981',
    appDanger: '#EF4444',
  },
};

const themes = {
  ...defaultConfig.themes,
  light: {
    ...defaultConfig.themes.light,
    background: '#F7F8FB',
    color: '#111827',
    primary: '#2563EB',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    muted: '#6B7280',
    success: '#059669',
    danger: '#DC2626',
  },
  dark: {
    ...defaultConfig.themes.dark,
    background: '#111827',
    color: '#F9FAFB',
    primary: '#60A5FA',
    surface: '#1F2937',
    border: 'rgba(255,255,255,0.1)',
    muted: '#9CA3AF',
    success: '#34D399',
    danger: '#F87171',
  },
};

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  tokens,
  themes,
  media: {
    ...defaultConfig.media,
    compact: { maxWidth: 420 },
    tablet: { minWidth: 768 },
  },
});

export type TamaguiConfig = typeof tamaguiConfig;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends TamaguiConfig {}
}

export default tamaguiConfig;
