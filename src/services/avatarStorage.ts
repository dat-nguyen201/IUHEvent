import { getStoredValue, removeStoredValue, setStoredValue } from '@/services/authStorage';

function avatarKey(userId: string) {
  return `iuh-event-avatar-${userId}`;
}

export function getAvatarUri(userId: string) {
  return getStoredValue(avatarKey(userId));
}

export function setAvatarUri(userId: string, uri: string) {
  return setStoredValue(avatarKey(userId), uri);
}

export function removeAvatarUri(userId: string) {
  return removeStoredValue(avatarKey(userId));
}
