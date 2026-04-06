import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Default cache TTL: 5 minutes.
 * Exported so it can be reused across modules.
 */
export const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

/**
 * Generic cache with TTL support using AsyncStorage.
 * Works on both web (localStorage via AsyncStorage) and mobile (native storage).
 *
 * @param key - Unique cache key (e.g. "expenses:currencies")
 * @param ttl - Time to live in milliseconds. Defaults to DEFAULT_CACHE_TTL (5 min).
 *
 * @example
 * const cache = createCache<Currency[]>('expenses:currencies');
 *
 * // Read from cache (returns null if expired or missing)
 * const cached = await cache.get();
 *
 * // Write to cache
 * await cache.set(currencies);
 *
 * // Invalidate
 * await cache.invalidate();
 */
export function createCache<T>(key: string, ttl: number = DEFAULT_CACHE_TTL) {
  return {
    async get(): Promise<T | null> {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;

        const entry: CacheEntry<T> = JSON.parse(raw);
        if (Date.now() - entry.cachedAt > ttl) {
          await AsyncStorage.removeItem(key);
          return null;
        }
        return entry.data;
      } catch {
        await AsyncStorage.removeItem(key).catch(() => {});
        return null;
      }
    },

    async set(data: T): Promise<void> {
      try {
        const entry: CacheEntry<T> = { data, cachedAt: Date.now() };
        await AsyncStorage.setItem(key, JSON.stringify(entry));
      } catch {
        // Storage full or unavailable — silently fail
      }
    },

    async invalidate(): Promise<void> {
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        // Silently fail
      }
    },
  };
}
