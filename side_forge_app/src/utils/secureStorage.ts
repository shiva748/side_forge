import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * In-memory cache mirrored with `expo-secure-store` (or `localStorage` on web preview)
 * so synchronous reads are instantaneous after initial hydration.
 */
const memoryCache = new Map<string, string>();

function getWebStorage(): Storage | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export const secureStorage = {
  getSync(key: string): string | null {
    if (memoryCache.has(key)) {
      return memoryCache.get(key) ?? null;
    }
    try {
      const webStorage = getWebStorage();
      const value = webStorage ? webStorage.getItem(key) : SecureStore.getItem(key);
      if (value !== null && value !== undefined) {
        memoryCache.set(key, value);
        return value;
      }
    } catch {
      // Fallback if synchronous storage access is unavailable in current runtime
    }
    return null;
  },

  async getAsync(key: string): Promise<string | null> {
    try {
      const webStorage = getWebStorage();
      const value = webStorage
        ? webStorage.getItem(key)
        : await SecureStore.getItemAsync(key);
      if (value !== null && value !== undefined) {
        memoryCache.set(key, value);
        return value;
      }
      memoryCache.delete(key);
      return null;
    } catch {
      return memoryCache.get(key) ?? null;
    }
  },

  async setAsync(key: string, value: string): Promise<void> {
    memoryCache.set(key, value);
    try {
      const webStorage = getWebStorage();
      if (webStorage) {
        webStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch {
      // Keep in-memory value if native keychain write fails
    }
  },

  async removeAsync(key: string): Promise<void> {
    memoryCache.delete(key);
    try {
      const webStorage = getWebStorage();
      if (webStorage) {
        webStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {
      // Ignore deletion errors for missing keys
    }
  },
};
