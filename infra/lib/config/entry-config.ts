import type { NamedStackFactory } from '@utils/types';

export interface VersionFactories {
  version: string;
  factories: NamedStackFactory[];
}

export interface EntryConfigResult {
  versions: VersionFactories[];
}

/**
 * Resolves which versions and stack factories to instantiate.
 * Supports deploying multiple versions simultaneously.
 * Used by bin/infra.ts; extracted for testability.
 */
export function getAppConfig(
  versionStacks: Record<string, NamedStackFactory[]>,
  defaultVersions: string[],
  deployVersions: string[],
  contextStacks: unknown,
): EntryConfigResult {
  const validVersions = Object.keys(versionStacks);
  const versions = deployVersions.length > 0 ? deployVersions : defaultVersions;

  const stacksFilter = parseStacksFilter(contextStacks);

  const result: VersionFactories[] = [];

  for (const version of versions) {
    if (!validVersions.includes(version)) {
      throw new Error(
        `Invalid version: "${version}". Valid versions: ${validVersions.join(', ')}.`,
      );
    }

    const factories = versionStacks[version] ?? [];

    const toInstantiate =
      stacksFilter && stacksFilter.length > 0
        ? factories.filter((f) => stacksFilter.includes(f.name))
        : factories;

    if (toInstantiate.length === 0) {
      if (stacksFilter?.length) {
        throw new Error(
          `No stack matches: ${stacksFilter.join(', ')}. ` +
            `Stacks available for ${version}: ${factories.map((f) => f.name).join(', ')}`,
        );
      }
      throw new Error(
        `No stacks defined for version "${version}". Add stacks in lib/versions/${version}/index.ts`,
      );
    }

    result.push({ version, factories: toInstantiate });
  }

  return { versions: result };
}

function parseStacksFilter(contextStacks: unknown): string[] | undefined {
  if (typeof contextStacks !== 'string') return undefined;
  const list = contextStacks
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

/**
 * Builds the full stack name for a given version and stack name.
 */
export const fullStackResource = (version: string, resource: string) =>
  `${process.env.PROJECT_PREFIX}-${version}-${resource}`;
