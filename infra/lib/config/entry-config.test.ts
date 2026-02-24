import { Stack } from 'aws-cdk-lib';
import { getAppConfig } from './entry-config';
import type { NamedStackFactory } from '@utils/types';

const createMockFactory = (name: string): NamedStackFactory => ({
  name,
  create: () => ({ node: {} }) as Stack,
});

describe('getAppConfig', () => {
  const versionStacks: Record<string, NamedStackFactory[]> = {
    v1: [createMockFactory('Auth'), createMockFactory('Database')],
    v2: [createMockFactory('ConsumerFromV1')],
  };
  const defaultVersion = 'v1';

  describe('version resolution', () => {
    test('uses deployVersion when set', () => {
      const result = getAppConfig(
        versionStacks,
        defaultVersion,
        'v2',
        undefined,
      );
      expect(result.version).toBe('v2');
      expect(result.factoriesToInstantiate).toHaveLength(1);
      expect(result.factoriesToInstantiate[0]?.name).toBe('ConsumerFromV1');
    });

    test('uses defaultVersion when deployVersion is undefined', () => {
      const result = getAppConfig(
        versionStacks,
        defaultVersion,
        undefined,
        undefined,
      );
      expect(result.version).toBe('v1');
      expect(result.factoriesToInstantiate).toHaveLength(2);
    });

    test('throws for invalid version', () => {
      expect(() =>
        getAppConfig(versionStacks, defaultVersion, 'v99', undefined),
      ).toThrow(
        'Invalid version: "v99". Use one of: v1, v2. Example: cdk deploy --context version=v1',
      );
    });
  });

  describe('stacks filter (context stacks)', () => {
    test('returns all factories when no context stacks', () => {
      const result = getAppConfig(
        versionStacks,
        defaultVersion,
        'v1',
        undefined,
      );
      expect(result.factoriesToInstantiate).toHaveLength(2);
    });

    test('filters by context stacks when provided', () => {
      const result = getAppConfig(
        versionStacks,
        defaultVersion,
        'v1',
        'Auth, Database',
      );
      expect(result.factoriesToInstantiate).toHaveLength(2);
      expect(result.factoriesToInstantiate.map((f) => f.name)).toEqual([
        'Auth',
        'Database',
      ]);
    });

    test('returns only matching stacks when filter is partial', () => {
      const result = getAppConfig(versionStacks, defaultVersion, 'v1', 'Auth');
      expect(result.factoriesToInstantiate).toHaveLength(1);
      expect(result.factoriesToInstantiate[0]?.name).toBe('Auth');
    });

    test('trims and ignores empty parts in context stacks', () => {
      const result = getAppConfig(
        versionStacks,
        defaultVersion,
        'v1',
        '  Auth  ,  , Database  ',
      );
      expect(result.factoriesToInstantiate.map((f) => f.name)).toEqual([
        'Auth',
        'Database',
      ]);
    });

    test('throws when filter matches no stack', () => {
      expect(() =>
        getAppConfig(versionStacks, defaultVersion, 'v1', 'NonExistent'),
      ).toThrow(
        'No stack matches: NonExistent. Stacks available for v1: Auth, Database',
      );
    });
  });

  describe('empty version stacks', () => {
    test('throws when version has no stacks and no filter', () => {
      const emptyStacks = { v1: [], v2: [createMockFactory('Only')] };
      expect(() =>
        getAppConfig(emptyStacks, 'v1', undefined, undefined),
      ).toThrow(
        'No stacks defined for version "v1". Add stacks in lib/versions/v1/index.ts',
      );
    });

    test('throws when version has no stacks but filter was provided', () => {
      const emptyStacks = { v1: [], v2: [] };
      expect(() => getAppConfig(emptyStacks, 'v1', undefined, 'Auth')).toThrow(
        /No stack matches/,
      );
    });
  });
});
