import type { Href } from 'expo-router';

export function getSafeEventRedirect(value?: string | string[]): Href | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  const match = candidate?.match(/^\/events\/([a-zA-Z0-9_-]+)$/);

  if (!match) return undefined;

  return { pathname: '/events/[id]', params: { id: match[1] } };
}
