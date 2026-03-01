import { DsqlStack } from './dsql-stack';
import { exportForCrossVersion } from '@utils/cross-version';
import { Construct } from 'constructs';

jest.mock('@utils/cross-version', () => ({
  exportForCrossVersion: jest.fn(),
}));

const mockExportForCrossVersion = exportForCrossVersion as jest.MockedFunction<
  typeof exportForCrossVersion
>;

jest.mock('aws-cdk-lib', () => {
  const MockStack = class {
    stackName = '';
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
  };
});

const mockCluster = {
  attrEndpoint: 'mock-endpoint',
  attrResourceArn: 'mock-arn',
  attrIdentifier: 'mock-id',
  applyRemovalPolicy: jest.fn(),
};

jest.mock('aws-cdk-lib/aws-dsql', () => ({
  CfnCluster: jest.fn().mockImplementation(() => mockCluster),
}));

describe('DsqlStack', () => {
  beforeEach(() => mockExportForCrossVersion.mockClear());

  test('instantiates without throwing', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    expect(
      () =>
        new DsqlStack(app as unknown as Construct, 'TestDatabaseStack', {
          version: 'v1',
          stackName: 'Database',
          description: 'Test DSQL stack',
          deletionProtectionEnabled: false,
        }),
    ).not.toThrow();
  });

  test('exposes clusterEndpoint, clusterArn and clusterId from mocked CfnCluster', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    const stack = new DsqlStack(
      app as unknown as Construct,
      'TestDatabaseStack',
      {
        version: 'v1',
        stackName: 'Database',
        description: 'Test DSQL stack',
        deletionProtectionEnabled: false,
      },
    );
    expect(stack.clusterEndpoint).toBe('mock-endpoint');
    expect(stack.clusterArn).toBe('mock-arn');
    expect(stack.clusterId).toBe('mock-id');
  });

  test('calls exportForCrossVersion three times with correct keys and Database stack name', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    new DsqlStack(app as unknown as Construct, 'TestDatabaseStack', {
      version: 'v1',
      stackName: 'Database',
      description: 'Test DSQL stack',
      deletionProtectionEnabled: false,
    });

    expect(mockExportForCrossVersion).toHaveBeenCalledTimes(3);

    expect(mockExportForCrossVersion).toHaveBeenCalledWith(
      expect.anything(),
      'ClusterEndpoint',
      'mock-endpoint',
      'v1',
      'Database',
    );
    expect(mockExportForCrossVersion).toHaveBeenCalledWith(
      expect.anything(),
      'ClusterArn',
      'mock-arn',
      'v1',
      'Database',
    );
    expect(mockExportForCrossVersion).toHaveBeenCalledWith(
      expect.anything(),
      'ClusterId',
      'mock-id',
      'v1',
      'Database',
    );
  });

  test('stackName follows BaseStack convention', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    const stack = new DsqlStack(
      app as unknown as Construct,
      'TestDatabaseStack',
      {
        version: 'v1',
        stackName: 'Database',
        description: 'Test DSQL stack',
        deletionProtectionEnabled: false,
      },
    );
    expect(stack.stackName).toBe('FinancialManagement-v1-Database');
  });

  test('calls applyRemovalPolicy with RETAIN when deletionProtectionEnabled is true', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    mockCluster.applyRemovalPolicy.mockClear();
    new DsqlStack(app as unknown as Construct, 'TestDatabaseStack', {
      version: 'v1',
      stackName: 'Database',
      description: 'Test',
      deletionProtectionEnabled: true,
    });
    expect(mockCluster.applyRemovalPolicy).toHaveBeenCalledWith('Retain');
  });

  test('calls applyRemovalPolicy with DESTROY when deletionProtectionEnabled is false', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    mockCluster.applyRemovalPolicy.mockClear();
    new DsqlStack(app as unknown as Construct, 'TestDatabaseStack', {
      version: 'v1',
      stackName: 'Database',
      description: 'Test',
      deletionProtectionEnabled: false,
    });
    expect(mockCluster.applyRemovalPolicy).toHaveBeenCalledWith('Destroy');
  });
});
