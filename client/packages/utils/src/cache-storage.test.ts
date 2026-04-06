const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) =>
      Promise.resolve(mockStore.get(key) ?? null),
    ),
    setItem: jest.fn((key: string, value: string) => {
      mockStore.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      mockStore.delete(key);
      return Promise.resolve();
    }),
  },
}));

import { createCache, DEFAULT_CACHE_TTL } from './cache-storage';

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

describe('DEFAULT_CACHE_TTL', () => {
  it('is 5 minutes in milliseconds', () => {
    expect(DEFAULT_CACHE_TTL).toBe(5 * 60 * 1000);
  });
});

describe('createCache', () => {
  it('returns null when cache is empty', async () => {
    const cache = createCache<string[]>('test:key');
    expect(await cache.get()).toBeNull();
  });

  it('stores and retrieves data', async () => {
    const cache = createCache<string[]>('test:key');
    const data = ['a', 'b', 'c'];

    await cache.set(data);
    expect(await cache.get()).toEqual(data);
  });

  it('returns null when TTL has expired', async () => {
    const cache = createCache<string[]>('test:key', 100);
    await cache.set(['a']);

    const raw = mockStore.get('test:key')!;
    const entry = JSON.parse(raw);
    entry.cachedAt = Date.now() - 200;
    mockStore.set('test:key', JSON.stringify(entry));

    expect(await cache.get()).toBeNull();
  });

  it('returns data when within TTL', async () => {
    const cache = createCache<string[]>('test:key', 10000);
    await cache.set(['a', 'b']);
    expect(await cache.get()).toEqual(['a', 'b']);
  });

  it('invalidates cache', async () => {
    const cache = createCache<string[]>('test:key');
    await cache.set(['a']);
    expect(await cache.get()).toEqual(['a']);

    await cache.invalidate();
    expect(await cache.get()).toBeNull();
  });

  it('handles corrupted JSON gracefully', async () => {
    const cache = createCache<string[]>('test:key');
    mockStore.set('test:key', 'not-valid-json');

    expect(await cache.get()).toBeNull();
    expect(mockStore.has('test:key')).toBe(false);
  });

  it('uses different keys independently', async () => {
    const cacheA = createCache<string>('key:a');
    const cacheB = createCache<number>('key:b');

    await cacheA.set('hello');
    await cacheB.set(42);

    expect(await cacheA.get()).toBe('hello');
    expect(await cacheB.get()).toBe(42);
  });

  it('stores complex objects', async () => {
    const cache = createCache<{ id: string; name: string }[]>('test:objects');
    const data = [
      { id: '1', name: 'COP' },
      { id: '2', name: 'MXN' },
    ];

    await cache.set(data);
    expect(await cache.get()).toEqual(data);
  });
});
