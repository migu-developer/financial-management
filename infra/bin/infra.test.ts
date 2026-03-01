import { DEFAULT_VERSION, VERSION_STACKS } from '@config/versions';
import { DEPLOY_VERSION } from '@versions/deploy-config';
import { getAppConfig } from '@config/entry-config';

describe('infra entry', () => {
  describe('getAppConfig (entry logic)', () => {
    test('returns version and factories for current deploy config', () => {
      const result = getAppConfig(
        VERSION_STACKS,
        DEFAULT_VERSION,
        DEPLOY_VERSION,
        undefined,
      );
      expect(result.version).toBeDefined();
      expect(['v1', 'v2']).toContain(result.version);
      expect(Array.isArray(result.factoriesToInstantiate)).toBe(true);
    });

    test('with real VERSION_STACKS, v1 has at least Auth and Database', () => {
      const result = getAppConfig(
        VERSION_STACKS,
        DEFAULT_VERSION,
        'v1',
        undefined,
      );
      const names = result.factoriesToInstantiate.map((f) => f.name);
      expect(names).toContain('Auth');
      expect(names).toContain('Database');
    });

    test('with real VERSION_STACKS, v2 has AmplifyHosting', () => {
      const result = getAppConfig(
        VERSION_STACKS,
        DEFAULT_VERSION,
        'v2',
        undefined,
      );
      const names = result.factoriesToInstantiate.map((f) => f.name);
      expect(names).toContain('AmplifyHosting');
    });

    test('filtering by stacks context returns only requested stacks', () => {
      const result = getAppConfig(
        VERSION_STACKS,
        DEFAULT_VERSION,
        'v1',
        'Database',
      );
      expect(result.factoriesToInstantiate).toHaveLength(1);
      expect(result.factoriesToInstantiate[0]?.name).toBe('Database');
    });
  });

  describe('entry flow (mocked factories)', () => {
    test('loop populates stackMap with one entry per factory', () => {
      const mockStack = { node: {} };
      const create = jest.fn().mockReturnValue(mockStack);
      const factoriesToInstantiate = [
        { name: 'Auth', create },
        { name: 'Database', create },
      ];
      const stackMap = new Map<string, unknown>();
      const deps = {
        getStack(name: string) {
          return stackMap.get(name);
        },
      };
      const version = 'v1';
      const mockApp = { node: {} };

      for (const { name, create: createFn } of factoriesToInstantiate) {
        const stack = createFn(mockApp, version, deps);
        stackMap.set(name, stack);
      }

      expect(stackMap.size).toBe(2);
      expect(stackMap.get('Auth')).toBe(mockStack);
      expect(stackMap.get('Database')).toBe(mockStack);
      expect(create).toHaveBeenCalledTimes(2);
      expect(create).toHaveBeenCalledWith(mockApp, version, deps);
    });
  });
});
