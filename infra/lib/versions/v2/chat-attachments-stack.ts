import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
  StorageClass,
} from 'aws-cdk-lib/aws-s3';
import { BaseStack, BaseStackProps } from '@core/base-stack';
import { exportForCrossVersion } from '@utils/cross-version';
import type { StackDeps } from '@utils/types';
import type { Construct } from 'constructs';

export interface ChatAttachmentsStackProps extends BaseStackProps {
  readonly deps?: StackDeps;
  /**
   * Shared bucket-name prefix, e.g. `migudev-fm-prod`. NOTE: it already
   * encodes the stage — do NOT append `stage` again or the bucket ends up
   * named `...-prod-prod-...`.
   */
  readonly assetsBucketPrefix: string;
  readonly allowedOrigins: string[];
}

/**
 * S3 bucket for user-uploaded chat attachments (receipt photos).
 *
 * Deliberately SEPARATE from the v1 assets bucket, for three reasons:
 *   1. v1 stacks are frozen once deployed to production.
 *   2. Presigned PUTs from the web build are cross-origin, so the bucket needs
 *      a CORS policy — the assets bucket holds email templates and should not
 *      get a browser-writable CORS surface.
 *   3. User content deserves its own lifecycle and its own least-privilege
 *      grants (chat Lambdas get this bucket, nothing else).
 *
 * An S3 bucket itself is free; cost is per GB stored, so splitting adds none.
 */
export class ChatAttachmentsStack extends BaseStack {
  public readonly bucket: Bucket;

  constructor(scope: Construct, id: string, props: ChatAttachmentsStackProps) {
    const {
      version,
      stackName,
      description,
      assetsBucketPrefix,
      allowedOrigins,
    } = props;
    super(scope, id, { version, stackName, description });

    this.bucket = new Bucket(this, 'ChatAttachmentsBucket', {
      bucketName: `${assetsBucketPrefix}-${this.region}-chat-attachments`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      // User content: never destroyed by a stack teardown.
      removalPolicy: RemovalPolicy.RETAIN,
      // Versioning is off on purpose — an attachment is written once and never
      // updated, so versions would only accumulate cost.
      versioned: false,
      cors: [
        {
          // Only PUT is needed: the client uploads through a presigned URL and
          // never reads the object back directly (Textract reads it server-side).
          allowedMethods: [HttpMethods.PUT],
          allowedOrigins,
          allowedHeaders: ['content-type'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: 'chat-attachments-lifecycle',
          enabled: true,
          prefix: 'chat-attachments/',
          transitions: [
            {
              storageClass: StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(30),
            },
          ],
          // A receipt stays viewable in the conversation for a year. This also
          // eventually reclaims ORPHANED uploads — an object whose presigned
          // PUT succeeded but whose `POST /chat` never followed (user cancelled)
          // is unreferenced by any message row and has no other cleanup path.
          expiration: Duration.days(365),
          // A phone upload interrupted mid-flight otherwise leaves billable
          // parts behind forever.
          abortIncompleteMultipartUploadAfter: Duration.days(1),
        },
      ],
    });

    exportForCrossVersion(
      this,
      'AttachmentsBucketName',
      this.bucket.bucketName,
      version,
      'ChatAttachments',
    );
    exportForCrossVersion(
      this,
      'AttachmentsBucketArn',
      this.bucket.bucketArn,
      version,
      'ChatAttachments',
    );
  }
}
