import { Construct } from 'constructs';
import { AssetsBucketStack } from './assets-bucket-stack';
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
    region = 'us-east-1';
    node = { addDependency: jest.fn(), children: [] };
    constructor(_scope: unknown, _id: string, props: Record<string, unknown>) {
      this.stackName = (props?.stackName as string) ?? 'Mock';
    }
  };
  return {
    Stack: MockStack,
    App: jest.fn().mockImplementation(() => ({
      node: { tryGetContext: jest.fn(), children: [] },
    })),
    RemovalPolicy: { RETAIN: 'Retain', DESTROY: 'Destroy' },
    Duration: { days: jest.fn().mockReturnValue({}) },
  };
});

const mockBucket = {
  bucketName: 'migudev-fm-us-east-1-assets',
  bucketArn: 'arn:aws:s3:::migudev-fm-us-east-1-assets',
};

jest.mock('aws-cdk-lib/aws-s3', () => ({
  Bucket: jest.fn().mockImplementation(() => mockBucket),
  BlockPublicAccess: { BLOCK_ALL: 'BlockAll' },
  BucketEncryption: { S3_MANAGED: 'S3Managed' },
  StorageClass: {
    INFREQUENT_ACCESS: 'STANDARD_IA',
    GLACIER_INSTANT_RETRIEVAL: 'GlacierInstantRetrieval',
  },
}));

describe('AssetsBucketStack', () => {
  beforeEach(() => mockExportForCrossVersion.mockClear());

  test('instantiates without throwing', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    expect(
      () =>
        new AssetsBucketStack(app as unknown as Construct, 'TestAssetsStack', {
          version: 'v1',
          stackName: 'Assets',
          description: 'Test Assets bucket stack',
        }),
    ).not.toThrow();
  });

  test('exposes bucket from mocked Bucket construct', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    const stack = new AssetsBucketStack(
      app as unknown as Construct,
      'TestAssetsStack',
      {
        version: 'v1',
        stackName: 'Assets',
        description: 'Test Assets bucket stack',
      },
    );
    expect(stack.bucket).toBe(mockBucket);
    expect(stack.bucket.bucketName).toBe('migudev-fm-us-east-1-assets');
    expect(stack.bucket.bucketArn).toBe(
      'arn:aws:s3:::migudev-fm-us-east-1-assets',
    );
  });

  test('calls exportForCrossVersion twice with AssetsBucketName and AssetsBucketArn', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    new AssetsBucketStack(app as unknown as Construct, 'TestAssetsStack', {
      version: 'v1',
      stackName: 'Assets',
      description: 'Test Assets bucket stack',
    });

    expect(mockExportForCrossVersion).toHaveBeenCalledTimes(2);

    expect(mockExportForCrossVersion).toHaveBeenCalledWith(
      expect.anything(),
      'AssetsBucketName',
      'migudev-fm-us-east-1-assets',
      'v1',
      'Assets',
    );
    expect(mockExportForCrossVersion).toHaveBeenCalledWith(
      expect.anything(),
      'AssetsBucketArn',
      'arn:aws:s3:::migudev-fm-us-east-1-assets',
      'v1',
      'Assets',
    );
  });

  test('stackName follows BaseStack convention', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    const stack = new AssetsBucketStack(
      app as unknown as Construct,
      'TestAssetsStack',
      {
        version: 'v1',
        stackName: 'Assets',
        description: 'Test Assets bucket stack',
      },
    );
    expect(stack.stackName).toBe('FinancialManagement-v1-Assets');
  });
});
