import { Construct } from 'constructs';
import {
  CognitoStack,
  CognitoStackProps,
  normalizePemFromEnv,
} from './cognito-stack';
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
    SecretValue: { unsafePlainText: jest.fn().mockReturnValue('mock-secret') },
    Runtime: { NODEJS_22_X: 'nodejs22.x' },
  };
});

jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => ({
  NodejsFunction: jest.fn().mockImplementation(() => ({})),
  OutputFormat: { ESM: 'ESM' },
}));

const mockUserPool = {
  userPoolId: 'mock-pool-id',
  userPoolArn: 'mock-pool-arn',
  userPoolProviderName: 'cognito-idp.mock',
};
const mockUserPoolClient = {
  userPoolClientId: 'mock-client-id',
  node: { addDependency: jest.fn() },
};

jest.mock('aws-cdk-lib/aws-cognito', () => {
  const actual = jest.requireActual<typeof import('aws-cdk-lib/aws-cognito')>(
    'aws-cdk-lib/aws-cognito',
  );
  return {
    ...actual,
    UserPool: jest.fn().mockImplementation(() => mockUserPool),
    UserPoolClient: jest.fn().mockImplementation(() => mockUserPoolClient),
    UserPoolDomain: jest.fn().mockImplementation(() => ({})),
    UserPoolIdentityProviderGoogle: jest
      .fn()
      .mockImplementation(() => ({ node: {} })),
    UserPoolIdentityProviderFacebook: jest
      .fn()
      .mockImplementation(() => ({ node: {} })),
    UserPoolIdentityProviderApple: jest
      .fn()
      .mockImplementation(() => ({ node: {} })),
    UserPoolIdentityProviderOidc: jest
      .fn()
      .mockImplementation(() => ({ node: {} })),
    CfnIdentityPool: jest
      .fn()
      .mockImplementation(() => ({ ref: 'mock-identity-id' })),
  };
});

const defaultProps: CognitoStackProps = {
  version: 'v1',
  stackName: 'Auth',
  description: 'Test Cognito stack',
  googleClientId: 'google-id',
  googleClientSecret: 'google-secret',
  facebookAppId: 'facebook-id',
  facebookAppSecret: 'facebook-secret',
  appleClientId: 'apple-id',
  appleTeamId: 'apple-team',
  appleKeyId: 'apple-key',
  applePrivateKey: 'apple-private-key',
  microsoftClientId: 'microsoft-id',
  microsoftClientSecret: 'microsoft-secret',
  microsoftTenantId: 'common',
  domainPrefix: 'fm-test-auth',
  callbackUrls: ['http://localhost:3000/auth/callback'],
  logoutUrls: ['http://localhost:3000'],
  sesFromEmail: 'noreply@example.com',
  sesReplyTo: 'support@example.com',
  snsRegion: 'us-east-1',
  removalProtect: false,
  cognitoEmailsPrefix: 'dummy-cognito-emails-prefix',
};

describe('CognitoStack', () => {
  beforeEach(() => mockExportForCrossVersion.mockClear());

  test('instantiates without throwing', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    expect(
      () =>
        new CognitoStack(
          app as unknown as Construct,
          'TestAuthStack',
          defaultProps,
        ),
    ).not.toThrow();
  });

  test('exposes userPool, userPoolClient and identityPoolId from mocked constructs', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    const stack = new CognitoStack(
      app as unknown as Construct,
      'TestAuthStack',
      defaultProps,
    );
    expect(stack.userPool).toBe(mockUserPool);
    expect(stack.userPoolClient).toBe(mockUserPoolClient);
    expect(stack.identityPoolId).toBe('mock-identity-id');
  });

  test('calls exportForCrossVersion four times with correct keys and Auth stack name', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    new CognitoStack(
      app as unknown as Construct,
      'TestAuthStack',
      defaultProps,
    );

    expect(mockExportForCrossVersion).toHaveBeenCalledTimes(4);

    expect(mockExportForCrossVersion).toHaveBeenCalledWith(
      expect.anything(),
      'UserPoolId',
      'mock-pool-id',
      'v1',
      'Auth',
    );
    expect(mockExportForCrossVersion).toHaveBeenCalledWith(
      expect.anything(),
      'UserPoolClientId',
      'mock-client-id',
      'v1',
      'Auth',
    );
    expect(mockExportForCrossVersion).toHaveBeenCalledWith(
      expect.anything(),
      'IdentityPoolId',
      'mock-identity-id',
      'v1',
      'Auth',
    );
    expect(mockExportForCrossVersion).toHaveBeenCalledWith(
      expect.anything(),
      'UserPoolArn',
      'mock-pool-arn',
      'v1',
      'Auth',
    );
  });

  test('stackName follows BaseStack convention', () => {
    const app = { node: { tryGetContext: jest.fn(), children: [] } };
    const stack = new CognitoStack(
      app as unknown as Construct,
      'TestAuthStack',
      defaultProps,
    );
    expect(stack.stackName).toBe('FinancialManagement-v1-Auth');
  });
});

describe('normalizePemFromEnv', () => {
  test('returns empty string as-is', () => {
    expect(normalizePemFromEnv('')).toBe('');
  });

  test('returns non-string input as-is', () => {
    expect(normalizePemFromEnv(null as unknown as string)).toBe(null);
    expect(normalizePemFromEnv(undefined as unknown as string)).toBe(undefined);
  });

  test('replaces literal \\n with real newlines', () => {
    const fromEnv =
      '-----BEGIN PRIVATE KEY-----\\nMIIEvQ\\n-----END PRIVATE KEY-----';
    const expected =
      '-----BEGIN PRIVATE KEY-----\nMIIEvQ\n-----END PRIVATE KEY-----';
    expect(normalizePemFromEnv(fromEnv)).toBe(expected);
  });

  test('trims leading and trailing whitespace', () => {
    expect(normalizePemFromEnv('  key  ')).toBe('key');
    // After \\n -> \n and trim(), leading/trailing newlines are also trimmed
    expect(normalizePemFromEnv('  \\nkey\\n  ')).toBe('key');
  });

  test('leaves string with real newlines unchanged (no literal \\n)', () => {
    const withNewlines = '-----BEGIN-----\nbody\n-----END-----';
    expect(normalizePemFromEnv(withNewlines)).toBe(withNewlines);
  });

  test('replaces literal \\r\\n with newline', () => {
    expect(normalizePemFromEnv('a\\r\\nb')).toBe('a\nb');
  });

  test('normalizes CRLF and \\r to \\n', () => {
    expect(normalizePemFromEnv('a\r\nb')).toBe('a\nb');
    expect(normalizePemFromEnv('a\rb')).toBe('a\nb');
  });
});
