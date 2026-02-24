import { App, Stack } from 'aws-cdk-lib';
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

  describe('app and stacks creation', () => {
    test('creates app and stacks from getAppConfig result', () => {
      const app = new App();
      const { version, factoriesToInstantiate } = getAppConfig(
        VERSION_STACKS,
        DEFAULT_VERSION,
        'v1',
        undefined,
      );
      const stackMap = new Map<string, Stack>();
      const deps = {
        getStack(name: string) {
          return stackMap.get(name);
        },
      };
      for (const { name, create } of factoriesToInstantiate) {
        const stack = create(app, version, deps);
        stackMap.set(name, stack);
      }
      expect(stackMap.size).toBe(factoriesToInstantiate.length);
      expect(app.node.children.length).toBeGreaterThan(0);
    });
  });
});
