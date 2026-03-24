import { DEFAULT_VERSIONS, VERSION_STACKS } from '@config/versions';
import { DEPLOY_VERSIONS } from '@versions/deploy-config';
import { getAppConfig } from '@config/entry-config';

describe('infra entry', () => {
  describe('getAppConfig (entry logic)', () => {
    test('returns versions and factories for current deploy config', () => {
      const result = getAppConfig(
        VERSION_STACKS,
        DEFAULT_VERSIONS,
        DEPLOY_VERSIONS,
        undefined,
      );
      expect(result.versions.length).toBeGreaterThan(0);
      for (const v of result.versions) {
        expect(['v1', 'v2']).toContain(v.version);
        expect(Array.isArray(v.factories)).toBe(true);
      }
    });

    test('deploys all versions in DEPLOY_VERSIONS', () => {
      const result = getAppConfig(
        VERSION_STACKS,
        DEFAULT_VERSIONS,
        DEPLOY_VERSIONS,
        undefined,
      );
      const deployedVersions = result.versions.map((v) => v.version);
      for (const expected of DEPLOY_VERSIONS) {
        expect(deployedVersions).toContain(expected);
      }
    });

    test('with real VERSION_STACKS, v1 has Auth and Assets', () => {
      const result = getAppConfig(
        VERSION_STACKS,
        DEFAULT_VERSIONS,
        ['v1'],
        undefined,
      );
      const names = result.versions[0]!.factories.map((f) => f.name);
      expect(names).toContain('Auth');
      expect(names).toContain('Assets');
    });

    test('with real VERSION_STACKS, v1 does not have Database (DSQL removed)', () => {
      const result = getAppConfig(
        VERSION_STACKS,
        DEFAULT_VERSIONS,
        ['v1'],
        undefined,
      );
      const names = result.versions[0]!.factories.map((f) => f.name);
      expect(names).not.toContain('Database');
    });

    test('with real VERSION_STACKS, v2 has AmplifyHosting', () => {
      const result = getAppConfig(
        VERSION_STACKS,
        DEFAULT_VERSIONS,
        ['v2'],
        undefined,
      );
      const names = result.versions[0]!.factories.map((f) => f.name);
      expect(names).toContain('AmplifyHosting');
    });

    test('deploying v1 and v2 together returns stacks from both', () => {
      const result = getAppConfig(
        VERSION_STACKS,
        DEFAULT_VERSIONS,
        ['v1', 'v2'],
        undefined,
      );
      expect(result.versions).toHaveLength(2);
      const v1Names = result.versions[0]!.factories.map((f) => f.name);
      const v2Names = result.versions[1]!.factories.map((f) => f.name);
      expect(v1Names).toContain('Auth');
      expect(v2Names).toContain('AmplifyHosting');
    });

    test('filtering by stacks context returns only requested stacks', () => {
      const result = getAppConfig(
        VERSION_STACKS,
        DEFAULT_VERSIONS,
        ['v1'],
        'Auth',
      );
      expect(result.versions[0]!.factories).toHaveLength(1);
      expect(result.versions[0]!.factories[0]!.name).toBe('Auth');
    });
  });

  describe('entry flow (mocked factories)', () => {
    test('loop populates stackMap with entries from multiple versions', () => {
      const mockStack = { node: {} };
      const create = jest.fn().mockReturnValue(mockStack);
      const versions = [
        {
          version: 'v1',
          factories: [
            { name: 'Auth', create },
            { name: 'Assets', create },
          ],
        },
        { version: 'v2', factories: [{ name: 'AmplifyHosting', create }] },
      ];
      const stackMap = new Map<string, unknown>();
      const deps = {
        getStack(name: string) {
          return stackMap.get(name);
        },
      };
      const mockApp = { node: {} };

      for (const { version, factories } of versions) {
        for (const { name, create: createFn } of factories) {
          const stack = createFn(mockApp, version, deps);
          stackMap.set(name, stack);
        }
      }

      expect(stackMap.size).toBe(3);
      expect(stackMap.get('Auth')).toBe(mockStack);
      expect(stackMap.get('Assets')).toBe(mockStack);
      expect(stackMap.get('AmplifyHosting')).toBe(mockStack);
      expect(create).toHaveBeenCalledTimes(3);
    });
  });
});
