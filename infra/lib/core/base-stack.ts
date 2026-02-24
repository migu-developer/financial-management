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
}

export class BaseStack extends Stack {
  constructor(scope: Construct, id: string, props: BaseStackProps) {
    const { version, stackName, description, ...stackProps } = props;
    const fullStackName = `FinancialManagement-${version}-${stackName}`;
    super(scope, id, {
      ...stackProps,
      stackName: fullStackName,
      description:
        description ?? `Financial Management - ${stackName} (${version})`,
      tags: {
        ...stackProps.tags,
        Version: version,
        Project: 'FinancialManagement',
        ManagedBy: 'CDK',
      },
    });
  }
}
