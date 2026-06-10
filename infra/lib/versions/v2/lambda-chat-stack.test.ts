import { Construct } from 'constructs';
import { LambdaChatStack } from './lambda-chat-stack';

jest.mock('@utils/cross-version', () => ({
  exportForCrossVersion: jest.fn(),
  importFromVersion: jest.fn(
    (_scope: unknown, _v: string, _stack: string, key: string) =>
      `imported-${key}`,
  ),
}));

jest.mock('./api-gateway-stack', () => ({
  ApiGatewayStack: {
    integration: jest.fn().mockReturnValue({ integrationId: 'mock' }),
  },
}));

const mockChatAddMethod = jest.fn();
const mockConfirmAddMethod = jest.fn();

const mockConfirmResource = { addMethod: mockConfirmAddMethod };
const mockChatResource = {
  addMethod: mockChatAddMethod,
  addResource: jest.fn().mockReturnValue(mockConfirmResource),
};

const mockModel = { modelId: 'mock-model' };
const mockAuthWithBody = {
  authorizationType: 'COGNITO',
  requestModels: { 'application/json': mockModel },
};

const mockGateway = {
  api: {
    root: { addResource: jest.fn().mockReturnValue(mockChatResource) },
  },
  createModel: jest.fn().mockReturnValue(mockModel),
  authWithBody: jest.fn().mockReturnValue(mockAuthWithBody),
};

const mockDeps = { getStack: jest.fn().mockReturnValue(mockGateway) };

const mockAddToRolePolicy = jest.fn();

jest.mock('aws-cdk-lib', () => {
  const MockStack = class {
    stackName = '';
    region = 'us-east-1';
    account = '123456789012';
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
    Duration: { seconds: (s: number) => s },
  };
});

jest.mock('aws-cdk-lib/aws-lambda', () => ({
  Runtime: { NODEJS_24_X: 'nodejs24.x' },
  Tracing: { ACTIVE: 'Active' },
}));

jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => ({
  NodejsFunction: jest.fn().mockImplementation(() => ({
    functionName: 'fm-dev-chat',
    addToRolePolicy: mockAddToRolePolicy,
  })),
  OutputFormat: { ESM: 'ESM' },
}));

jest.mock('aws-cdk-lib/aws-logs', () => ({
  LogGroup: jest.fn(),
  RetentionDays: { THREE_MONTHS: 90 },
}));

jest.mock('aws-cdk-lib/aws-iam', () => ({
  PolicyStatement: jest.fn().mockImplementation((props: unknown) => ({
    type: 'PolicyStatement',
    props,
  })),
}));

const defaultProps = {
  version: 'v2',
  stackName: 'LambdaChat',
  description: 'Test Lambda Chat stack',
  databaseUrl: 'postgresql://localhost:5432/test',
  databaseReadonlyUrl: 'postgresql://localhost:5432/test-readonly',
  allowedOrigins: ['https://dev-financial-management.migudev.com'],
  stage: 'dev',
  deps: mockDeps,
};

// The mocked importFromVersion returns `imported-${key}` for any cross-version
// import. So CHAT_STATE_MACHINE_ARN resolves to 'imported-StateMachineArn'.
const IMPORTED_SFN_ARN = 'imported-StateMachineArn';

function createStack(overrides: Partial<typeof defaultProps> = {}) {
  const app = { node: { tryGetContext: jest.fn(), children: [] } };
  return new LambdaChatStack(
    app as unknown as Construct,
    'TestLambdaChatStack',
    { ...defaultProps, ...overrides },
  );
}

describe('LambdaChatStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChatResource.addResource.mockReturnValue(mockConfirmResource);
    mockGateway.api.root.addResource.mockReturnValue(mockChatResource);
    mockGateway.createModel.mockReturnValue(mockModel);
    mockGateway.authWithBody.mockReturnValue(mockAuthWithBody);
    mockDeps.getStack.mockReturnValue(mockGateway);
  });

  test('instantiates without throwing', () => {
    expect(() => createStack()).not.toThrow();
  });

  test('stackName follows BaseStack convention', () => {
    const stack = createStack();
    expect(stack.stackName).toBe('FinancialManagement-v2-LambdaChat');
  });

  test('gets gateway from deps via ApiGateway key', () => {
    createStack();
    expect(mockDeps.getStack).toHaveBeenCalledWith('ApiGateway');
  });

  describe('Lambda function', () => {
    test('uses Node.js 24 runtime', () => {
      createStack();
      const { NodejsFunction: MockFn } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-lambda-nodejs');
      const fnProps = (MockFn as jest.Mock).mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      expect(fnProps.runtime).toBe('nodejs24.x');
    });

    test('uses functionName fm-{stage}-chat', () => {
      createStack({ stage: 'prod' });
      const { NodejsFunction: MockFn } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-lambda-nodejs');
      const fnProps = (MockFn as jest.Mock).mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      expect(fnProps.functionName).toBe('fm-prod-chat');
    });

    test('exposes DATABASE_URL, ALLOWED_ORIGINS and CHAT_STATE_MACHINE_ARN env vars', () => {
      createStack();
      const { NodejsFunction: MockFn } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-lambda-nodejs');
      const fnProps = (MockFn as jest.Mock).mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      const env = fnProps.environment as Record<string, string>;
      expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/test');
      expect(env.DATABASE_READONLY_URL).toBe(
        'postgresql://localhost:5432/test-readonly',
      );
      expect(env.ALLOWED_ORIGINS).toBe(
        'https://dev-financial-management.migudev.com',
      );
      expect(env.CHAT_STATE_MACHINE_ARN).toBe(IMPORTED_SFN_ARN);
    });

    test('imports StateMachineArn from the StepFunctionsChat stack', () => {
      createStack();
      const { importFromVersion } = jest.requireMock<Record<string, jest.Mock>>(
        '@utils/cross-version',
      );
      expect(importFromVersion).toHaveBeenCalledWith(
        expect.anything(),
        'v2',
        'StepFunctionsChat',
        'StateMachineArn',
      );
    });
  });

  describe('IAM permissions', () => {
    test('grants states:StartExecution scoped to the imported chat state machine ARN', () => {
      createStack();
      const startExecCall = mockAddToRolePolicy.mock.calls.find(
        (c: unknown[]) => {
          const stmt = c[0] as { props: { actions: string[] } };
          return stmt.props.actions.includes('states:StartExecution');
        },
      );
      expect(startExecCall).toBeDefined();
      const stmt = startExecCall![0] as {
        props: { resources: string[] };
      };
      expect(stmt.props.resources).toEqual([IMPORTED_SFN_ARN]);
    });

    test('grants states:SendTaskSuccess and SendTaskFailure with resource *', () => {
      createStack();
      const sendTaskCall = mockAddToRolePolicy.mock.calls.find(
        (c: unknown[]) => {
          const stmt = c[0] as { props: { actions: string[] } };
          return stmt.props.actions.includes('states:SendTaskSuccess');
        },
      );
      expect(sendTaskCall).toBeDefined();
      const stmt = sendTaskCall![0] as {
        props: { actions: string[]; resources: string[] };
      };
      expect(stmt.props.actions).toContain('states:SendTaskFailure');
      expect(stmt.props.resources).toEqual(['*']);
    });
  });

  describe('API Gateway routing', () => {
    test('creates /chat resource on api root', () => {
      createStack();
      expect(mockGateway.api.root.addResource).toHaveBeenCalledWith('chat');
    });

    test('creates /chat/confirm sub-resource', () => {
      createStack();
      expect(mockChatResource.addResource).toHaveBeenCalledWith('confirm');
    });

    test('adds POST on /chat', () => {
      createStack();
      const methods = mockChatAddMethod.mock.calls.map((c: unknown[]) => c[0]);
      expect(methods).toContain('POST');
    });

    test('adds POST on /chat/confirm', () => {
      createStack();
      const methods = mockConfirmAddMethod.mock.calls.map(
        (c: unknown[]) => c[0],
      );
      expect(methods).toContain('POST');
    });

    test('does not add GET/PUT/PATCH/DELETE methods', () => {
      createStack();
      const allMethods = [
        ...mockChatAddMethod.mock.calls.map((c: unknown[]) => c[0]),
        ...mockConfirmAddMethod.mock.calls.map((c: unknown[]) => c[0]),
      ];
      ['GET', 'PUT', 'PATCH', 'DELETE'].forEach((m) =>
        expect(allMethods).not.toContain(m),
      );
    });

    test('both routes use Cognito authorization', () => {
      createStack();
      const allCalls = [
        ...(mockChatAddMethod.mock.calls as unknown[][]),
        ...(mockConfirmAddMethod.mock.calls as unknown[][]),
      ];
      for (const call of allCalls) {
        const opts = call[2] as Record<string, unknown>;
        expect(opts.authorizationType).toBe('COGNITO');
      }
    });
  });

  test('creates a passthrough JSON body model', () => {
    createStack();
    expect(mockGateway.createModel).toHaveBeenCalledTimes(1);
    const call = mockGateway.createModel.mock.calls[0]!;
    expect(call[1]).toBe('ChatBody');
    const schema = call[2] as Record<string, unknown>;
    expect(schema.type).toBe('object');
    expect(schema.additionalProperties).toBe(true);
  });

  test('exports FunctionName via cross-version', () => {
    createStack();
    const { exportForCrossVersion } = jest.requireMock<
      Record<string, jest.Mock>
    >('@utils/cross-version');
    const exportKeys = (exportForCrossVersion as jest.Mock).mock.calls.map(
      (c: unknown[]) => c[1],
    );
    expect(exportKeys).toContain('FunctionName');
  });
});
