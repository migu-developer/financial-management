import { Construct } from 'constructs';
import { LambdaDocumentsStack } from './lambda-documents-stack';

jest.mock('@utils/cross-version', () => ({
  importFromVersion: jest.fn(
    (_scope: unknown, _v: string, _stack: string, key: string) =>
      `imported-${key}`,
  ),
}));

jest.mock('./api-docs', () => ({
  ApiDocumentation: jest.fn().mockImplementation(() => ({
    addResource: jest.fn(),
    createVersion: jest.fn(),
  })),
}));

jest.mock('./api-gateway-stack', () => ({
  ApiGatewayStack: {
    integration: jest.fn().mockReturnValue({ integrationId: 'mock' }),
  },
}));

const mockAddMethod = jest.fn();
const mockDocumentsResource = { addMethod: mockAddMethod };

const mockAuthOnly = { authorizationType: 'COGNITO' };

const mockGateway = {
  api: {
    root: { addResource: jest.fn().mockReturnValue(mockDocumentsResource) },
  },
  createModel: jest.fn(),
  authOnly: jest.fn().mockReturnValue(mockAuthOnly),
  authWithBody: jest.fn(),
  authWithBodyAndParams: jest.fn(),
};

const mockDeps = { getStack: jest.fn().mockReturnValue(mockGateway) };

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
    Duration: { seconds: (s: number) => s },
  };
});

jest.mock('aws-cdk-lib/aws-lambda', () => ({
  Runtime: { NODEJS_22_X: 'nodejs22.x' },
}));

jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => ({
  NodejsFunction: jest.fn().mockImplementation(() => ({})),
  OutputFormat: { ESM: 'ESM' },
}));

jest.mock('aws-cdk-lib/aws-apigateway', () => ({
  LambdaIntegration: jest.fn().mockImplementation(() => ({
    integrationId: 'mock-integration',
  })),
}));

const defaultProps = {
  version: 'v2',
  stackName: 'LambdaDocuments',
  description: 'Test Lambda Documents stack',
  databaseUrl: 'postgresql://localhost:5432/test',
  databaseReadonlyUrl: 'postgresql://localhost:5432/test',
  allowedOrigins: ['https://dev-financial-management.migudev.com'],
  deps: mockDeps,
};

function createStack() {
  const app = { node: { tryGetContext: jest.fn(), children: [] } };
  return new LambdaDocumentsStack(
    app as unknown as Construct,
    'TestLambdaDocumentsStack',
    defaultProps,
  );
}

describe('LambdaDocumentsStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGateway.api.root.addResource.mockReturnValue(mockDocumentsResource);
    mockGateway.authOnly.mockReturnValue(mockAuthOnly);
    mockDeps.getStack.mockReturnValue(mockGateway);
  });

  test('instantiates without throwing', () => {
    expect(() => createStack()).not.toThrow();
  });

  test('gets gateway from deps', () => {
    createStack();
    expect(mockDeps.getStack).toHaveBeenCalledWith('ApiGateway');
  });

  test('stackName follows BaseStack convention', () => {
    const stack = createStack();
    expect(stack.stackName).toBe('FinancialManagement-v2-LambdaDocuments');
  });

  test('creates /documents resource on api root', () => {
    createStack();
    expect(mockGateway.api.root.addResource).toHaveBeenCalledWith('documents');
  });

  test('adds GET method on /documents', () => {
    createStack();
    const methods = mockAddMethod.mock.calls.map((c: unknown[]) => c[0]);
    expect(methods).toContain('GET');
  });

  test('/documents GET uses Cognito authorization via authOnly', () => {
    createStack();
    const getCall = mockAddMethod.mock.calls.find(
      (c: unknown[]) => c[0] === 'GET',
    );
    expect(getCall![2]).toBe(mockAuthOnly);
    expect(mockGateway.authOnly).toHaveBeenCalled();
  });

  test('does not add write methods on /documents', () => {
    createStack();
    const methods = mockAddMethod.mock.calls.map((c: unknown[]) => c[0]);
    expect(methods).not.toContain('POST');
    expect(methods).not.toContain('PUT');
    expect(methods).not.toContain('PATCH');
    expect(methods).not.toContain('DELETE');
  });

  test('does not create any models', () => {
    createStack();
    expect(mockGateway.createModel).not.toHaveBeenCalled();
  });

  describe('Lambda function', () => {
    test('uses Node.js 22 runtime', () => {
      createStack();
      const { NodejsFunction: MockFn } = jest.requireMock<
        Record<string, jest.Mock>
      >('aws-cdk-lib/aws-lambda-nodejs');
      const fnProps = (MockFn as jest.Mock).mock.calls[0]![2] as Record<
        string,
        unknown
      >;
      expect(fnProps.runtime).toBe('nodejs22.x');
    });

    test('receives DATABASE_URL and ALLOWED_ORIGINS env vars', () => {
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
      expect(env.ALLOWED_ORIGINS).toBe(
        'https://dev-financial-management.migudev.com',
      );
    });
  });
});
