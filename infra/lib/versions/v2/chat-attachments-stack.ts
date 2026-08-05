import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
  StorageClass,
} from 'aws-cdk-lib/aws-s3';
import {
  ATTACHMENT_READY_PREFIX,
  ATTACHMENT_UPLOAD_PREFIX,
} from '@packages/models/chat/attachment-keys';
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
      // ObjectCreated events go to EventBridge, which starts the
      // image-processing state machine. The rule filters on the UPLOAD prefix
      // only, so the normalized object this workflow writes back into the same
      // bucket cannot re-trigger it — that would be an infinite loop.
      eventBridgeEnabled: true,
      cors: [
        {
          // PUT for the presigned upload; GET so the chat can render a receipt
          // the user already sent, through a presigned read.
          //
          // GET is not strictly required for an `<img>`/RN `Image` (those are
          // not CORS-governed), but it is required the moment anything reaches
          // the object with `fetch`/XHR — a download button, a canvas thumbnail.
          // Allowing it now costs nothing and avoids a confusing CORS failure
          // later; the bucket stays private either way, since every read still
          // needs a signature.
          allowedMethods: [HttpMethods.PUT, HttpMethods.GET],
          allowedOrigins,
          allowedHeaders: ['content-type'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          // RAW uploads. Short-lived by design: once normalization has written
          // the `chat-ready/` object, the original is dead weight — the
          // conversation only ever references the normalized key. A week gives
          // room to re-run normalization if we ship a bug in it.
          id: 'chat-attachments-raw-uploads',
          enabled: true,
          prefix: `${ATTACHMENT_UPLOAD_PREFIX}/`,
          expiration: Duration.days(7),
          // A phone upload interrupted mid-flight otherwise leaves billable
          // parts behind forever.
          abortIncompleteMultipartUploadAfter: Duration.days(1),
        },
        {
          // NORMALIZED images — the ones the conversation references, so they
          // live as long as the receipt stays viewable in the chat history.
          // Expiry is also the only cleanup path for an attachment whose
          // `POST /chat` never followed (user cancelled): it is referenced by
          // no message row.
          id: 'chat-attachments-normalized',
          enabled: true,
          prefix: `${ATTACHMENT_READY_PREFIX}/`,
          transitions: [
            {
              storageClass: StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(30),
            },
          ],
          expiration: Duration.days(365),
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
