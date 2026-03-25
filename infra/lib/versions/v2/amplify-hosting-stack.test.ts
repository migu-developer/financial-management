import { Construct } from 'constructs';
import { AmplifyHostingStack } from './amplify-hosting-stack';
import { importFromVersion } from '@utils/cross-version';
import { CfnApp, CfnBranch } from 'aws-cdk-lib/aws-amplify';

jest.mock('@utils/cross-version', () => ({
  importFromVersion: jest.fn(
    (_scope: unknown, _v: string, _stack: string, key: string) =>
      `imported-${key}`,
  ),
}));

const mockImportFromVersion = importFromVersion as jest.MockedFunction<
  typeof importFromVersion
>;

const mockGetStack = jest.fn();

const mockCfnApp = {
  attrAppId: 'mock-app-id',
  attrDefaultDomain: 'mock.amplifyapp.com',
  attrArn: 'arn:aws:amplify:us-east-1:123456789012:apps/mock-app-id',
  addDependency: jest.fn(),
  node: { tryGetContext: jest.fn(), addDependency: jest.fn() },
};

const mockCfnBranch = {
  addDependency: jest.fn(),
  node: {},
};

jest.mock('aws-cdk-lib', () => {
  const MockStack = class {
    stackName = '';
    region = 'us-east-1';
    node = { tryGetContext: jest.fn(), addDependency: jest.fn(), children: [] };
    constructor(_scope: unknown, _id: string, props: Record<string, unknown>) {
      this.stackName = (props?.stackName as string) ?? 'Mock';
    }
  };
  return {
    Stack: MockStack,
    CfnOutput: jest.fn(),
    App: jest.fn().mockImplementation(() => ({
      node: { tryGetContext: jest.fn(), children: [] },
    })),
    Fn: {
      join: jest.fn((_delim: string, parts: string[]) => parts.join('')),
    },
  };
});

jest.mock('aws-cdk-lib/aws-amplify', () => ({
  CfnApp: jest.fn().mockImplementation(() => mockCfnApp),
  CfnBranch: jest.fn().mockImplementation(() => mockCfnBranch),
}));

describe('AmplifyHostingStack', () => {
  beforeEach(() => {
    mockImportFromVersion.mockClear();
    mockImportFromVersion.mockImplementation(
      (_scope: unknown, _v: string, _stack: string, key: string) =>
        `imported-${key}`,
    );
  });

  test('instantiates without throwing', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    expect(
      () =>
        new AmplifyHostingStack(
          app as unknown as Construct,
          'AmplifyHostingStack',
          {
            version: 'v2',
            stackName: 'AmplifyHosting',
            description: 'Amplify Hosting for client app',
            repository: 'https://github.com/org/repo',
            accessTokenName: 'github-migudev-token',
            platform: 'WEB',
            stage: 'DEVELOPMENT',
            defaultBranchName: 'develop',
            enableAutoBuild: false,
            appRoot: 'client/main',
            assetsBucketUrl: 'https://example.com',
            applicationUrl: 'https://example.com',
          },
        ),
    ).not.toThrow();
  });

  test('calls importFromVersion for Auth and Assets from v1', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    new AmplifyHostingStack(
      app as unknown as Construct,
      'AmplifyHostingStack',
      {
        version: 'v2',
        stackName: 'AmplifyHosting',
        description: 'Amplify Hosting for client app',
        repository: 'https://github.com/org/repo',
        accessTokenName: 'github-migudev-token',
        platform: 'WEB',
        stage: 'DEVELOPMENT',
        defaultBranchName: 'develop',
        enableAutoBuild: false,
        appRoot: 'client/main',
        assetsBucketUrl: 'https://example.com',
        applicationUrl: 'https://example.com',
      },
    );

    expect(mockImportFromVersion).toHaveBeenCalledTimes(5);

    expect(mockImportFromVersion).toHaveBeenCalledWith(
      expect.anything(),
      'v1',
      'Auth',
      'UserPoolId',
    );
    expect(mockImportFromVersion).toHaveBeenCalledWith(
      expect.anything(),
      'v1',
      'Auth',
      'UserPoolClientId',
    );
    expect(mockImportFromVersion).toHaveBeenCalledWith(
      expect.anything(),
      'v1',
      'Auth',
      'IdentityPoolId',
    );
    expect(mockImportFromVersion).toHaveBeenCalledWith(
      expect.anything(),
      'v1',
      'Assets',
      'AssetsBucketName',
    );
    expect(mockImportFromVersion).toHaveBeenCalledWith(
      expect.anything(),
      'v1',
      'Auth',
      'CognitoDomain',
    );
  });

  test('calls deps.getStack for LambdaExpenses', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    new AmplifyHostingStack(
      app as unknown as Construct,
      'AmplifyHostingStack',
      {
        version: 'v2',
        stackName: 'AmplifyHosting',
        deps: { getStack: mockGetStack },
        defaultBranchName: 'develop',
        repository: 'https://github.com/org/repo',
        accessTokenName: 'github-migudev-token',
        platform: 'WEB',
        stage: 'DEVELOPMENT',
        appRoot: 'client/main',
        assetsBucketUrl: 'https://example.com',
        applicationUrl: 'https://example.com',
        enableAutoBuild: false,
      },
    );
    expect(mockGetStack).toHaveBeenCalledWith('LambdaExpenses');
  });

  test('exposes amplifyApp and defaultBranch', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    const stack = new AmplifyHostingStack(
      app as unknown as Construct,
      'AmplifyHostingStack',
      {
        version: 'v2',
        stackName: 'AmplifyHosting',
        description: 'Amplify Hosting for client app',
        repository: 'https://github.com/org/repo',
        accessTokenName: 'github-migudev-token',
        platform: 'WEB',
        stage: 'DEVELOPMENT',
        defaultBranchName: 'develop',
        enableAutoBuild: false,
        appRoot: 'client/main',
        assetsBucketUrl: 'https://example.com',
        applicationUrl: 'https://example.com',
      },
    );
    expect(stack.amplifyApp).toBe(mockCfnApp);
    expect(stack.defaultBranch).toBe(mockCfnBranch);
  });

  test('stackName follows BaseStack convention', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    const stack = new AmplifyHostingStack(
      app as unknown as Construct,
      'AmplifyHostingStack',
      {
        version: 'v2',
        stackName: 'AmplifyHosting',
        description: 'Amplify Hosting for client app',
        repository: 'https://github.com/org/repo',
        accessTokenName: 'github-migudev-token',
        platform: 'WEB',
        stage: 'DEVELOPMENT',
        defaultBranchName: 'develop',
        enableAutoBuild: false,
        appRoot: 'client/main',
        assetsBucketUrl: 'https://example.com',
        applicationUrl: 'https://example.com',
      },
    );
    expect(stack.stackName).toBe('FinancialManagement-v2-AmplifyHosting');
  });

  test('passes stackName as app name and defaultBranchName to CfnApp and CfnBranch', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    (CfnApp as unknown as jest.Mock).mockClear();
    (CfnBranch as unknown as jest.Mock).mockClear();
    new AmplifyHostingStack(
      app as unknown as Construct,
      'AmplifyHostingStack',
      {
        version: 'v2',
        stackName: 'AmplifyHosting',
        description: 'Amplify Hosting for client app',
        repository: 'https://github.com/org/repo',
        accessTokenName: 'github-migudev-token',
        platform: 'WEB',
        stage: 'DEVELOPMENT',
        defaultBranchName: 'develop',
        enableAutoBuild: false,
        appRoot: 'client/main',
        assetsBucketUrl: 'https://example.com',
        applicationUrl: 'https://example.com',
      },
    );
    expect(CfnApp).toHaveBeenCalledWith(
      expect.anything(),
      'ClientApp',
      expect.objectContaining({
        name: 'AmplifyHosting',
      }),
    );
    expect(CfnBranch).toHaveBeenCalledWith(
      expect.anything(),
      'MainBranch',
      expect.objectContaining({
        branchName: 'develop',
      }),
    );
  });
});
