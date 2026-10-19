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
  },
};

const themes = {
  ...defaultConfig.themes,
  light: {
    ...defaultConfig.themes.light,
    background: '#F7F8FB',
    color: '#111827',
    primary: '#2563EB',
  },
  dark: {
    ...defaultConfig.themes.dark,
    background: '#111827',
    color: '#F9FAFB',
    primary: '#60A5FA',
  },
};

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  tokens,
  themes,
});

export type TamaguiConfig = typeof tamaguiConfig;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends TamaguiConfig {}
}

export default tamaguiConfig;
