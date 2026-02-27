import { RemovalPolicy } from 'aws-cdk-lib';
import { CfnCluster } from 'aws-cdk-lib/aws-dsql';
import { BaseStack, BaseStackProps } from '@core/base-stack';
import { exportForCrossVersion } from '@utils/cross-version';
import type { Construct } from 'constructs';
import { StackDeps } from '@utils/types';

export interface DsqlStackProps extends BaseStackProps {
  /** Optional: only needed if this stack depends on other v1 stacks. */
  readonly deps?: StackDeps;

  /** Whether to enable deletion protection on the DSQL cluster. */
  readonly deletionProtectionEnabled: boolean;
}

/**
 * Aurora DSQL serverless distributed SQL cluster.
 *
 * Exports values for cross-version consumption (v2 Lambdas):
 * - ClusterEndpoint, ClusterArn, ClusterId
 */
export class DsqlStack extends BaseStack {
  public readonly clusterEndpoint: string;
  public readonly clusterArn: string;
  public readonly clusterId: string;

  constructor(scope: Construct, id: string, props: DsqlStackProps) {
    const { version, stackName, description, deletionProtectionEnabled } =
      props;
    super(scope, id, { version, stackName, description });

    const cluster = new CfnCluster(this, 'DsqlCluster', {
      deletionProtectionEnabled,
    });

    cluster.applyRemovalPolicy(
      deletionProtectionEnabled ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    );

    this.clusterEndpoint = cluster.attrEndpoint;
    this.clusterArn = cluster.attrResourceArn;
    this.clusterId = cluster.attrIdentifier;

    exportForCrossVersion(
      this,
      'ClusterEndpoint',
      this.clusterEndpoint,
      version,
      'Database',
    );
    exportForCrossVersion(
      this,
      'ClusterArn',
      this.clusterArn,
      version,
      'Database',
    );
    exportForCrossVersion(
      this,
      'ClusterId',
      this.clusterId,
      version,
      'Database',
    );
  }
}
