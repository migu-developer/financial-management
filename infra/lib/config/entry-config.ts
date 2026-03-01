import type { NamedStackFactory } from '@utils/types';

export interface EntryConfigResult {
  version: string;
  factoriesToInstantiate: NamedStackFactory[];
}

/**
 * Resolves version and which stack factories to instantiate.
 * Used by bin/infra.ts; extracted for testability.
 */
export function getAppConfig(
  versionStacks: Record<string, NamedStackFactory[]>,
  defaultVersion: string,
  deployVersion: string | undefined,
  contextStacks: unknown,
): EntryConfigResult {
  const validVersions = Object.keys(versionStacks);
  const version = deployVersion ?? defaultVersion;

  const stacksFilter = parseStacksFilter(contextStacks);

  if (!validVersions.includes(version)) {
    throw new Error(
      `Invalid version: "${version}". Use one of: ${validVersions.join(', ')}. ` +
        `Example: cdk deploy --context version=v1`,
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

  return { version, factoriesToInstantiate: toInstantiate };
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
