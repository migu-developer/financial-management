import type { Construct } from 'constructs';
import type { Stack } from 'aws-cdk-lib';

/**
 * Provides access to stacks already created in this version (same app run).
 * Use this for same-version dependencies: e.g. Compute stack needs VPC from Networking stack.
 * Stacks are available by their short name (e.g. 'Networking', 'Placeholder').
 */
export interface StackDeps {
  getStack(name: string): Stack | undefined;
}

/**
 * Function that creates a stack. Receives deps to reference other stacks of the same version.
 * Creation order in lib/versions/vX/index.ts defines dependency order: put dependents after their dependencies.
 */
export type StackFactory = (
  scope: Construct,
  version: string,
  deps: StackDeps,
) => Stack;

/**
 * Stack registered with short name to filter with --context stacks=Name1,Name2
 */
export interface NamedStackFactory {
  /** Short name (e.g: 'Placeholder', 'Networking'). Used in deps.getStack(name) and --context stacks. */
  name: string;
  create: StackFactory;
}
