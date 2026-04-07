import AsyncStorage from '@react-native-async-storage/async-storage';

const COGNITO_KEY_PREFIX = 'CognitoIdentityServiceProvider.';

/**
 * Storage adapter for amazon-cognito-identity-js that works on both web and mobile.
 *
 * The Cognito SDK calls getItem/setItem/removeItem **synchronously**.
 * AsyncStorage is async. We bridge this gap with an in-memory cache:
 *
 * - `hydrate()` loads all Cognito keys from AsyncStorage into memory (call once at startup)
 * - `getItem()` reads from the in-memory cache (sync)
 * - `setItem()` writes to cache (sync) AND persists to AsyncStorage (async, fire-and-forget)
 * - `removeItem()` removes from cache (sync) AND from AsyncStorage (async, fire-and-forget)
 *
 * This ensures the SDK always gets sync responses while data persists across
 * app restarts via AsyncStorage.
 */
export class CognitoStorageAdapter implements Storage {
  private cache = new Map<string, string>();

  get length(): number {
    return this.cache.size;
  }

  /**
   * Hydrate the in-memory cache from AsyncStorage.
   * MUST be called and awaited before creating CognitoUserPool.
   */
  async hydrate(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cognitoKeys = allKeys.filter((key: string) =>
        key.startsWith(COGNITO_KEY_PREFIX),
      );
      if (cognitoKeys.length === 0) return;

      const pairs = await AsyncStorage.multiGet(cognitoKeys);
      for (const [key, value] of pairs) {
        if (value !== null) {
          this.cache.set(key, value);
        }
      }
    } catch {
      // AsyncStorage unavailable — cache stays empty, user will need to re-login
    }
  }

  getItem(key: string): string | null {
    return this.cache.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value);
    void AsyncStorage.setItem(key, value).catch(() => {});
  }

  removeItem(key: string): void {
    this.cache.delete(key);
    void AsyncStorage.removeItem(key).catch(() => {});
  }

  clear(): void {
    const keys = [...this.cache.keys()];
    this.cache.clear();
    void AsyncStorage.multiRemove(keys).catch(() => {});
  }

  key(index: number): string | null {
    const keys = [...this.cache.keys()];
    return keys[index] ?? null;
  }
}
