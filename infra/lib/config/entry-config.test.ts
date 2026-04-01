import { Stack } from 'aws-cdk-lib';
import { fullStackResource, getAppConfig } from './entry-config';
import type { NamedStackFactory } from '@utils/types';

const createMockFactory = (name: string): NamedStackFactory => ({
  name,
  create: () => ({ node: {} }) as Stack,
});

describe('getAppConfig', () => {
  const versionStacks: Record<string, NamedStackFactory[]> = {
    v1: [createMockFactory('Auth'), createMockFactory('Assets')],
    v2: [createMockFactory('AmplifyHosting')],
  };
  const defaultVersions = ['v1'];

  describe('version resolution', () => {
    test('uses deployVersions when provided', () => {
      const result = getAppConfig(
        versionStacks,
        defaultVersions,
        ['v2'],
        undefined,
      );
      expect(result.versions).toHaveLength(1);
      expect(result.versions[0]!.version).toBe('v2');
      expect(result.versions[0]!.factories).toHaveLength(1);
      expect(result.versions[0]!.factories[0]!.name).toBe('AmplifyHosting');
    });

    test('uses defaultVersions when deployVersions is empty', () => {
      const result = getAppConfig(
        versionStacks,
        defaultVersions,
        [],
        undefined,
      );
      expect(result.versions).toHaveLength(1);
      expect(result.versions[0]!.version).toBe('v1');
    });

    test('deploys multiple versions simultaneously', () => {
      const result = getAppConfig(
        versionStacks,
        defaultVersions,
        ['v1', 'v2'],
        undefined,
      );
      expect(result.versions).toHaveLength(2);
      expect(result.versions[0]!.version).toBe('v1');
      expect(result.versions[0]!.factories).toHaveLength(2);
      expect(result.versions[1]!.version).toBe('v2');
      expect(result.versions[1]!.factories).toHaveLength(1);
    });

    test('throws for invalid version in array', () => {
      expect(() =>
        getAppConfig(versionStacks, defaultVersions, ['v99'], undefined),
      ).toThrow('Invalid version: "v99". Valid versions: v1, v2.');
    });

    test('throws for invalid version even when mixed with valid ones', () => {
      expect(() =>
        getAppConfig(versionStacks, defaultVersions, ['v1', 'v99'], undefined),
      ).toThrow('Invalid version: "v99"');
    });
  });

  describe('stacks filter (context stacks)', () => {
    test('returns all factories when no context stacks', () => {
      const result = getAppConfig(
        versionStacks,
        defaultVersions,
        ['v1'],
        undefined,
      );
      expect(result.versions[0]!.factories).toHaveLength(2);
    });

    test('filters by context stacks when provided', () => {
      const result = getAppConfig(
        versionStacks,
        defaultVersions,
        ['v1'],
        'Auth, Assets',
      );
      expect(result.versions[0]!.factories).toHaveLength(2);
      expect(result.versions[0]!.factories.map((f) => f.name)).toEqual([
        'Auth',
        'Assets',
      ]);
    });

    test('returns only matching stacks when filter is partial', () => {
      const result = getAppConfig(
        versionStacks,
        defaultVersions,
        ['v1'],
        'Auth',
      );
      expect(result.versions[0]!.factories).toHaveLength(1);
      expect(result.versions[0]!.factories[0]!.name).toBe('Auth');
    });

    test('trims and ignores empty parts in context stacks', () => {
      const result = getAppConfig(
        versionStacks,
        defaultVersions,
        ['v1'],
        '  Auth  ,  , Assets  ',
      );
      expect(result.versions[0]!.factories.map((f) => f.name)).toEqual([
        'Auth',
        'Assets',
      ]);
    });

    test('throws when filter matches no stack', () => {
      expect(() =>
        getAppConfig(versionStacks, defaultVersions, ['v1'], 'NonExistent'),
      ).toThrow(
        'No stack matches: NonExistent. Stacks available for v1: Auth, Assets',
      );
    });

    test('filter applies to each version independently', () => {
      const result = getAppConfig(
        versionStacks,
        defaultVersions,
        ['v2'],
        'AmplifyHosting',
      );
      expect(result.versions[0]!.factories).toHaveLength(1);
      expect(result.versions[0]!.factories[0]!.name).toBe('AmplifyHosting');
    });
  });

  describe('empty version stacks', () => {
    test('throws when version has no stacks and no filter', () => {
      const emptyStacks = { v1: [], v2: [createMockFactory('Only')] };
      expect(() => getAppConfig(emptyStacks, ['v1'], [], undefined)).toThrow(
        'No stacks defined for version "v1". Add stacks in lib/versions/v1/index.ts',
      );
    });

    test('throws when version has no stacks but filter was provided', () => {
      const emptyStacks = { v1: [], v2: [] };
      expect(() => getAppConfig(emptyStacks, ['v1'], [], 'Auth')).toThrow(
        /No stack matches/,
      );
    });
  });
});

describe('fullStackResource', () => {
  test('builds the full stack resource for a given version and resource', () => {
    process.env.PROJECT_PREFIX = 'FinancialManagement';
    expect(fullStackResource('v1', 'Auth')).toBe('FinancialManagement-v1-Auth');
  });

  test('builds the full stack resource for a given version and resource', () => {
    process.env.PROJECT_PREFIX = 'FinancialManagement';
    expect(fullStackResource('v1', 'auth')).toBe('FinancialManagement-v1-auth');
  });
});
