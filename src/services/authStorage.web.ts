function getStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export async function getStoredValue(key: string) {
  return getStorage()?.getItem(key) ?? null;
}

export async function setStoredValue(key: string, value: string) {
  getStorage()?.setItem(key, value);
}

export async function removeStoredValue(key: string) {
  getStorage()?.removeItem(key);
}
