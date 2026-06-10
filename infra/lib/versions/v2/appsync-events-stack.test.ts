import { Construct } from 'constructs';
import { AppSyncEventsStack } from './appsync-events-stack';

jest.mock('@utils/cross-version', () => ({
  exportForCrossVersion: jest.fn(),
  importFromVersion: jest.fn(
    (_scope: unknown, _v: string, _stack: string, key: string) =>
      `imported-${key}`,
  ),
}));

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
    CfnOutput: jest.fn(),
  };
});

jest.mock('aws-cdk-lib/aws-cognito', () => ({
  UserPool: {
    fromUserPoolArn: jest.fn((_scope: unknown, id: string, arn: string) => ({
      node: { id },
      userPoolArn: arn,
    })),
  },
}));

const mockAddChannelNamespace = jest.fn().mockReturnValue({
  channelNamespace: 'chat',
});

jest.mock('aws-cdk-lib/aws-appsync', () => ({
  AppSyncAuthorizationType: {
    USER_POOL: 'AMAZON_COGNITO_USER_POOLS',
    IAM: 'AWS_IAM',
    API_KEY: 'API_KEY',
    OIDC: 'OPENID_CONNECT',
    LAMBDA: 'AWS_LAMBDA',
  },
  EventApi: jest.fn().mockImplementation(() => ({
    apiId: 'mock-api-id',
    apiArn: 'arn:aws:appsync:us-east-1:123:apis/mock-api-id',
    httpDns: 'mock.appsync-api.us-east-1.amazonaws.com',
    realtimeDns: 'mock.appsync-realtime-api.us-east-1.amazonaws.com',
    addChannelNamespace: mockAddChannelNamespace,
  })),
  ChannelNamespace: jest.fn(),
}));

const defaultProps = {
  version: 'v2',
  stackName: 'AppSyncEvents',
  description: 'Test AppSync Events stack',
  stage: 'dev',
};

function createStack() {
  const app = { node: { tryGetContext: jest.fn(), children: [] } };
  return new AppSyncEventsStack(
    app as unknown as Construct,
    'TestAppSyncEventsStack',
    defaultProps,
  );
}

describe('AppSyncEventsStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('instantiates without throwing', () => {
    expect(() => createStack()).not.toThrow();
  });

  test('stackName follows BaseStack convention', () => {
    const stack = createStack();
    expect(stack.stackName).toBe('FinancialManagement-v2-AppSyncEvents');
  });

  test('imports UserPoolArn from v1 Auth stack', () => {
    createStack();
    const { importFromVersion } = jest.requireMock<Record<string, jest.Mock>>(
      '@utils/cross-version',
    );
    expect(importFromVersion).toHaveBeenCalledWith(
      expect.anything(),
      'v1',
      'Auth',
      'UserPoolArn',
    );
  });

  test('builds Cognito UserPool reference from imported ARN', () => {
    createStack();
    const { UserPool } = jest.requireMock<{
      UserPool: { fromUserPoolArn: jest.Mock };
    }>('aws-cdk-lib/aws-cognito');
    expect(UserPool.fromUserPoolArn).toHaveBeenCalledWith(
      expect.anything(),
      'AppSyncEvents-ImportedUserPool',
      'imported-UserPoolArn',
    );
  });

  describe('EventApi', () => {
    test('uses stage-aware apiName', () => {
      createStack();
      const { EventApi: MockEventApi } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-appsync');
      const apiProps = (MockEventApi as jest.Mock).mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      expect(apiProps.apiName).toBe('fm-dev-chat-events');
    });

    test('registers Cognito User Pool auth provider', () => {
      createStack();
      const { EventApi: MockEventApi } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-appsync');
      const apiProps = (MockEventApi as jest.Mock).mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      const auth = apiProps.authorizationConfig as {
        authProviders: Array<{
          authorizationType: string;
          cognitoConfig?: unknown;
        }>;
      };
      const userPoolProvider = auth.authProviders.find(
        (p) => p.authorizationType === 'AMAZON_COGNITO_USER_POOLS',
      );
      expect(userPoolProvider).toBeDefined();
      expect(userPoolProvider!.cognitoConfig).toBeDefined();
    });

    test('registers IAM auth provider for backend publishes', () => {
      createStack();
      const { EventApi: MockEventApi } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-appsync');
      const apiProps = (MockEventApi as jest.Mock).mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      const auth = apiProps.authorizationConfig as {
        authProviders: Array<{ authorizationType: string }>;
      };
      const iamProvider = auth.authProviders.find(
        (p) => p.authorizationType === 'AWS_IAM',
      );
      expect(iamProvider).toBeDefined();
    });

    test('clients connect with Cognito JWT', () => {
      createStack();
      const { EventApi: MockEventApi } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-appsync');
      const apiProps = (MockEventApi as jest.Mock).mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      const auth = apiProps.authorizationConfig as {
        connectionAuthModeTypes: string[];
      };
      expect(auth.connectionAuthModeTypes).toEqual([
        'AMAZON_COGNITO_USER_POOLS',
      ]);
    });

    test('backend publishes via IAM', () => {
      createStack();
      const { EventApi: MockEventApi } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-appsync');
      const apiProps = (MockEventApi as jest.Mock).mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      const auth = apiProps.authorizationConfig as {
        defaultPublishAuthModeTypes: string[];
      };
      expect(auth.defaultPublishAuthModeTypes).toEqual(['AWS_IAM']);
    });

    test('clients subscribe with Cognito JWT', () => {
      createStack();
      const { EventApi: MockEventApi } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-appsync');
      const apiProps = (MockEventApi as jest.Mock).mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      const auth = apiProps.authorizationConfig as {
        defaultSubscribeAuthModeTypes: string[];
      };
      expect(auth.defaultSubscribeAuthModeTypes).toEqual([
        'AMAZON_COGNITO_USER_POOLS',
      ]);
    });
  });

  describe('Channel namespace', () => {
    test('creates the chat namespace', () => {
      createStack();
      expect(mockAddChannelNamespace).toHaveBeenCalledWith('chat');
    });

    test('exposes the namespace name as a static constant', () => {
      expect(AppSyncEventsStack.CHAT_NAMESPACE_NAME).toBe('chat');
    });
  });

  describe('Cross-version exports', () => {
    test('exports EventApiId, EventApiArn, HttpDns, RealtimeDns and ChatNamespaceName', () => {
      createStack();
      const { exportForCrossVersion } = jest.requireMock<
        Record<string, jest.Mock>
      >('@utils/cross-version');
      const exportKeys = (exportForCrossVersion as jest.Mock).mock.calls.map(
        (c: unknown[]) => c[1],
      );
      expect(exportKeys).toEqual([
        'EventApiId',
        'EventApiArn',
        'HttpDns',
        'RealtimeDns',
        'ChatNamespaceName',
      ]);
    });

    test('exports are scoped under AppSyncEvents stack short name', () => {
      createStack();
      const { exportForCrossVersion } = jest.requireMock<
        Record<string, jest.Mock>
      >('@utils/cross-version');
      const stackNames: string[] = (
        exportForCrossVersion as jest.Mock
      ).mock.calls.map((c: unknown[]) => c[4] as string);
      stackNames.forEach((name) => {
        expect(name).toBe('AppSyncEvents');
      });
    });
  });
});
