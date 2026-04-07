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
    getAllKeys: jest.fn(() => Promise.resolve([...mockStore.keys()])),
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(
        keys.map(
          (key) => [key, mockStore.get(key) ?? null] as [string, string | null],
        ),
      ),
    ),
    multiRemove: jest.fn((keys: string[]) => {
      for (const key of keys) mockStore.delete(key);
      return Promise.resolve();
    }),
  },
}));

import { CognitoStorageAdapter } from './cognito-storage-adapter';

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

describe('CognitoStorageAdapter', () => {
  describe('hydrate', () => {
    it('loads Cognito keys from AsyncStorage into memory', async () => {
      mockStore.set(
        'CognitoIdentityServiceProvider.client.user.idToken',
        'token-123',
      );
      mockStore.set(
        'CognitoIdentityServiceProvider.client.LastAuthUser',
        'user1',
      );
      mockStore.set('other-key', 'should-be-ignored');

      const adapter = new CognitoStorageAdapter();
      await adapter.hydrate();

      expect(
        adapter.getItem('CognitoIdentityServiceProvider.client.user.idToken'),
      ).toBe('token-123');
      expect(
        adapter.getItem('CognitoIdentityServiceProvider.client.LastAuthUser'),
      ).toBe('user1');
      expect(adapter.getItem('other-key')).toBeNull();
    });

    it('handles empty AsyncStorage', async () => {
      const adapter = new CognitoStorageAdapter();
      await adapter.hydrate();
      expect(adapter.length).toBe(0);
    });
  });

  describe('getItem', () => {
    it('returns null for missing keys', () => {
      const adapter = new CognitoStorageAdapter();
      expect(adapter.getItem('nonexistent')).toBeNull();
    });

    it('returns value after setItem', () => {
      const adapter = new CognitoStorageAdapter();
      adapter.setItem('key', 'value');
      expect(adapter.getItem('key')).toBe('value');
    });
  });

  describe('setItem', () => {
    it('writes to in-memory cache synchronously', () => {
      const adapter = new CognitoStorageAdapter();
      adapter.setItem('key', 'value');
      expect(adapter.getItem('key')).toBe('value');
    });

    it('persists to AsyncStorage asynchronously', async () => {
      const adapter = new CognitoStorageAdapter();
      adapter.setItem('CognitoIdentityServiceProvider.test', 'value');

      // Wait for async write
      await new Promise((r) => setTimeout(r, 10));
      expect(mockStore.get('CognitoIdentityServiceProvider.test')).toBe(
        'value',
      );
    });
  });

  describe('removeItem', () => {
    it('removes from in-memory cache synchronously', () => {
      const adapter = new CognitoStorageAdapter();
      adapter.setItem('key', 'value');
      adapter.removeItem('key');
      expect(adapter.getItem('key')).toBeNull();
    });
  });

  describe('clear', () => {
    it('removes all keys from cache', () => {
      const adapter = new CognitoStorageAdapter();
      adapter.setItem('a', '1');
      adapter.setItem('b', '2');
      adapter.clear();
      expect(adapter.length).toBe(0);
    });
  });

  describe('length', () => {
    it('returns count of cached items', () => {
      const adapter = new CognitoStorageAdapter();
      expect(adapter.length).toBe(0);
      adapter.setItem('a', '1');
      expect(adapter.length).toBe(1);
      adapter.setItem('b', '2');
      expect(adapter.length).toBe(2);
    });
  });

  describe('key', () => {
    it('returns key at index', () => {
      const adapter = new CognitoStorageAdapter();
      adapter.setItem('a', '1');
      adapter.setItem('b', '2');
      expect(adapter.key(0)).toBe('a');
      expect(adapter.key(1)).toBe('b');
      expect(adapter.key(2)).toBeNull();
    });
  });
});
