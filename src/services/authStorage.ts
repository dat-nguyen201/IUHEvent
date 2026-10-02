import * as SecureStore from 'expo-secure-store';

export function getStoredValue(key: string) {
  return SecureStore.getItemAsync(key);
}

export function setStoredValue(key: string, value: string) {
  return SecureStore.setItemAsync(key, value);
}

export function removeStoredValue(key: string) {
  return SecureStore.deleteItemAsync(key);
}
