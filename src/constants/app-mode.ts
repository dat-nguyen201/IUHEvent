export type AppMode = 'demo' | 'remote';

const configuredMode = process.env.EXPO_PUBLIC_APP_MODE;

export const appModeConfigError =
  configuredMode && configuredMode !== 'demo' && configuredMode !== 'remote'
    ? 'INVALID_APP_MODE'
    : null;

export const appMode: AppMode = !configuredMode || configuredMode === 'demo' ? 'demo' : 'remote';
