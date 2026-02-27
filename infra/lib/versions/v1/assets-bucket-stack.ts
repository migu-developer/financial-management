import { RemovalPolicy } from 'aws-cdk-lib';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  StorageClass,
} from 'aws-cdk-lib/aws-s3';
import { Duration } from 'aws-cdk-lib';
import { BaseStack, BaseStackProps } from '@core/base-stack';
import { exportForCrossVersion } from '@utils/cross-version';
import type { Construct } from 'constructs';
import { StackDeps } from '@utils/types';

export interface AssetsBucketStackProps extends BaseStackProps {
  /** Optional: not used for assets bucket; kept for interface consistency. */
  readonly deps?: StackDeps;
}

/**
 * S3 bucket for project assets and transactional email HTML.
 * - Name: migudev-fm-{region}-assets
 * - Block all public access (access only via IAM policies or presigned URLs).
 * - Versioning enabled with lifecycle: noncurrent versions → STANDARD_IA (30d) → GLACIER_IR (90d) → expire (365d).
 * - RemovalPolicy.RETAIN so bucket and objects are preserved on stack delete.
 */
export class AssetsBucketStack extends BaseStack {
  public readonly bucket: Bucket;

  constructor(scope: Construct, id: string, props: AssetsBucketStackProps) {
    const { version, stackName, description } = props;
    super(scope, id, { version, stackName, description });

    const region = this.region;
    const bucketName = `migudev-fm-${region}-assets`;

    this.bucket = new Bucket(this, 'AssetsBucket', {
      bucketName,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'migudev-noncurrent-versions-lifecycle',
          enabled: true,
          noncurrentVersionTransitions: [
            {
              storageClass: StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(30),
            },
            {
              storageClass: StorageClass.GLACIER_INSTANT_RETRIEVAL,
              transitionAfter: Duration.days(90),
            },
          ],
          noncurrentVersionExpiration: Duration.days(365),
        },
      ],
    });

    // ── Cross-version exports (for v2 or other stacks) ─────────────────────
    exportForCrossVersion(
      this,
      'AssetsBucketName',
      this.bucket.bucketName,
      version,
      'Assets',
    );
    exportForCrossVersion(
      this,
      'AssetsBucketArn',
      this.bucket.bucketArn,
      version,
      'Assets',
    );
  }
}
