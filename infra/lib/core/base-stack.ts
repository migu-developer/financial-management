import { Stack, StackProps } from 'aws-cdk-lib';
import { type Construct } from 'constructs';

/**
 * Base stack with common conventions: tags, description and versioned name.
 * All domain stacks can extend this class.
 */
export interface BaseStackProps extends StackProps {
  /** Version of the stack set (e.g: 'v1', 'v2'). It is included in the stack name. */
  readonly version: string;
  /** Short name of the stack (e.g: 'Networking', 'Compute'). */
  readonly stackName: string;
  /** Optional description for documentation in CloudFormation. */
  readonly description?: string;
  /**
   * Names of stacks this stack depends on (cross-version deploy ordering).
   * Resolved after all stacks are created via BaseStack.resolveDependencies().
   */
  readonly dependsOn?: string[];
}

/** Builds the props passed to Stack. Extracted for testability without CDK. */
export function buildBaseStackProps(props: BaseStackProps): {
  stackName: string;
  description: string;
  tags: Record<string, string>;
} {
  const { version, stackName, description, ...stackProps } = props;
  const fullStackName = `FinancialManagement-${version}-${stackName}`;
  return {
    stackName: fullStackName,
    description:
      description ?? `Financial Management - ${stackName} (${version})`,
    tags: {
      ...(stackProps.tags as Record<string, string>),
      Version: version,
      Project: 'FinancialManagement',
      ManagedBy: 'CDK',
    },
  };
}

export class BaseStack extends Stack {
  public readonly dependsOnNames: string[];

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    const { version, stackName, description, dependsOn, ...stackProps } = props;

    const built = buildBaseStackProps({
      ...props,
      version,
      stackName,
      description,
    });

    super(scope, id, {
      ...stackProps,
      stackName: built.stackName,
      description: built.description,
      tags: built.tags,
    });

    this.dependsOnNames = dependsOn ?? [];
  }

  /**
   * Resolves cross-version dependencies after all stacks are created.
   * Call once from infra.ts after the creation loop.
   */
  static resolveDependencies(stackMap: Map<string, Stack>): void {
    for (const [, stack] of stackMap) {
      if (stack instanceof BaseStack && stack.dependsOnNames.length > 0) {
        for (const name of stack.dependsOnNames) {
          const dep = stackMap.get(name);
          if (dep) stack.addDependency(dep);
        }
      }
    }
  }
}
