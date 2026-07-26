import { Construct } from 'constructs';
import { ChatAttachmentsStack } from './chat-attachments-stack';
import { exportForCrossVersion } from '@utils/cross-version';

jest.mock('@utils/cross-version', () => ({
  exportForCrossVersion: jest.fn(),
}));

const mockExportForCrossVersion = exportForCrossVersion as jest.MockedFunction<
  typeof exportForCrossVersion
>;

jest.mock('aws-cdk-lib', () => {
  const MockStack = class {
    stackName = '';
    region = 'us-east-2';
    node = { addDependency: jest.fn(), children: [] };
    constructor(_scope: unknown, _id: string, props: Record<string, unknown>) {
      this.stackName = (props?.stackName as string) ?? 'Mock';
    }
  };
  return {
    Stack: MockStack,
    RemovalPolicy: { RETAIN: 'Retain', DESTROY: 'Destroy' },
    Duration: { days: (d: number) => ({ days: d }) },
  };
});

const mockBucket = {
  bucketName: 'migudev-fm-prod-us-east-2-chat-attachments',
  bucketArn: 'arn:aws:s3:::migudev-fm-prod-us-east-2-chat-attachments',
};

jest.mock('aws-cdk-lib/aws-s3', () => ({
  Bucket: jest.fn().mockImplementation(() => mockBucket),
  BlockPublicAccess: { BLOCK_ALL: 'BlockAll' },
  BucketEncryption: { S3_MANAGED: 'S3Managed' },
  HttpMethods: { PUT: 'PUT', GET: 'GET', POST: 'POST' },
  StorageClass: { INFREQUENT_ACCESS: 'STANDARD_IA' },
}));

const app = { node: { tryGetContext: jest.fn(), children: [] } };

const createStack = () =>
  new ChatAttachmentsStack(
    app as unknown as Construct,
    'TestChatAttachmentsStack',
    {
      version: 'v2',
      stackName: 'ChatAttachments',
      description: 'Test chat attachments bucket',
      assetsBucketPrefix: 'migudev-fm-prod',
      allowedOrigins: ['https://financial-management.migudev.com'],
    },
  );

const bucketProps = () => {
  const { Bucket: MockBucket } = jest.requireMock('aws-cdk-lib/aws-s3') as {
    Bucket: jest.Mock;
  };
  return MockBucket.mock.calls[0]![2] as Record<string, unknown>;
};

describe('ChatAttachmentsStack', () => {
  beforeEach(() => jest.clearAllMocks());

  test('instantiates without throwing', () => {
    expect(createStack).not.toThrow();
  });

  test('does NOT append the stage to the bucket name (the prefix already has it)', () => {
    createStack();
    // `migudev-fm-prod` + region. A second `-prod` would mean the prefix was
    // concatenated with `stage` again.
    expect(bucketProps().bucketName).toBe(
      'migudev-fm-prod-us-east-2-chat-attachments',
    );
    expect(bucketProps().bucketName).not.toContain('prod-prod');
  });

  test('blocks all public access and forces SSL', () => {
    createStack();
    expect(bucketProps().blockPublicAccess).toBe('BlockAll');
    expect(bucketProps().enforceSSL).toBe(true);
    expect(bucketProps().encryption).toBe('S3Managed');
  });

  test('retains user content when the stack is deleted', () => {
    createStack();
    expect(bucketProps().removalPolicy).toBe('Retain');
  });

  test('allows only PUT from the app origins, so presigned uploads work on web', () => {
    createStack();
    const cors = bucketProps().cors as Array<{
      allowedMethods: string[];
      allowedOrigins: string[];
    }>;
    expect(cors).toHaveLength(1);
    // Read access is never needed from the browser — Textract reads the object
    // server-side — so PUT is the ONLY method exposed.
    expect(cors[0]!.allowedMethods).toEqual(['PUT']);
    expect(cors[0]!.allowedOrigins).toEqual([
      'https://financial-management.migudev.com',
    ]);
  });

  test('expires RAW uploads quickly and keeps normalized images for a year', () => {
    createStack();
    const rules = bucketProps().lifecycleRules as Array<{
      id: string;
      prefix: string;
      expiration: { days: number };
      abortIncompleteMultipartUploadAfter: { days: number };
      transitions?: Array<{ storageClass: string; transitionAfter: unknown }>;
    }>;
    expect(rules).toHaveLength(2);

    const raw = rules.find((r) => r.prefix === 'chat-attachments/');
    const ready = rules.find((r) => r.prefix === 'chat-ready/');
    expect(raw).toBeDefined();
    expect(ready).toBeDefined();

    // The raw upload is dead weight once normalization has written the ready
    // object — a week only exists so normalization can be re-run after a fix.
    expect(raw!.expiration).toEqual({ days: 7 });
    expect(raw!.transitions).toBeUndefined();

    // The normalized image is what the conversation references, so it lives as
    // long as the receipt stays viewable. Expiry is also the only cleanup path
    // for an attachment whose POST /chat never followed.
    expect(ready!.expiration).toEqual({ days: 365 });
    expect(ready!.transitions![0]!.storageClass).toBe('STANDARD_IA');

    for (const rule of rules) {
      expect(rule.abortIncompleteMultipartUploadAfter).toEqual({ days: 1 });
    }
  });

  test('enables EventBridge notifications so uploads can trigger normalization', () => {
    createStack();
    expect(bucketProps().eventBridgeEnabled).toBe(true);
  });

  test('does not enable versioning (attachments are written once)', () => {
    createStack();
    expect(bucketProps().versioned).toBe(false);
  });

  test('exports the bucket name and arn for the chat stacks to import', () => {
    createStack();
    const exported = mockExportForCrossVersion.mock.calls.map((c) => c[1]);
    expect(exported).toEqual(['AttachmentsBucketName', 'AttachmentsBucketArn']);
    expect(mockExportForCrossVersion.mock.calls[0]![4]).toBe('ChatAttachments');
  });
});
