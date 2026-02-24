import type { NamedStackFactory } from '@utils/types';
import { v1Stacks } from '@versions/v1';
import { v2Stacks } from '@versions/v2';

/**
 * Definition of which stacks belong to each version.
 * Add new versions importing from lib/versions/vX
 * to keep a clear record of what is implemented by version.
 */
export const VERSION_STACKS: Record<string, NamedStackFactory[]> = {
  v1: v1Stacks,
  v2: v2Stacks,
};

/**
 * Default version when no --context version=X is passed
 */
export const DEFAULT_VERSION = 'v1';

/**
 * List of valid versions (useful for validation and scripts)
 */
export const VALID_VERSIONS = Object.keys(VERSION_STACKS);
