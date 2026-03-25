import { Construct } from 'constructs';
import { LambdaExpensesStack } from './lambda-expenses-stack';
import { importFromVersion } from '@utils/cross-version';

jest.mock('@utils/cross-version', () => ({
  importFromVersion: jest.fn(
    (_scope: unknown, _v: string, _stack: string, key: string) =>
      `imported-${key}`,
  ),
}));

const mockImportFromVersion = importFromVersion as jest.MockedFunction<
  typeof importFromVersion
>;

const mockItemAddMethod = jest.fn();
const mockCollectionAddMethod = jest.fn();
const mockItemResource = { addMethod: mockItemAddMethod };
const mockCollectionResource = {
  addMethod: mockCollectionAddMethod,
  addResource: jest.fn().mockReturnValue(mockItemResource),
};
const mockRootAddResource = jest.fn().mockReturnValue(mockCollectionResource);
const mockApi = {
  url: 'https://mock-api.execute-api.us-east-1.amazonaws.com/prod/',
  root: { addResource: mockRootAddResource },
};

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
    Runtime: { NODEJS_22_X: 'nodejs22.x' },
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
  RestApi: jest.fn().mockImplementation(() => mockApi),
  CognitoUserPoolsAuthorizer: jest.fn().mockImplementation(() => ({
    authorizerId: 'mock-authorizer-id',
  })),
  LambdaIntegration: jest.fn().mockImplementation(() => ({
    integrationId: 'mock-integration',
  })),
  AuthorizationType: { COGNITO: 'COGNITO' },
}));

jest.mock('aws-cdk-lib/aws-cognito', () => ({
  UserPool: {
    fromUserPoolArn: jest.fn().mockReturnValue({ userPoolId: 'mock-pool' }),
  },
}));

const defaultProps = {
  version: 'v2',
  stackName: 'LambdaExpenses',
  description: 'Test Lambda Expenses stack',
  databaseUrl: 'postgresql://localhost:5432/test',
  allowedOrigins: ['https://dev-financial-management.migudev.com'],
};

function createStack() {
  const app = { node: { tryGetContext: jest.fn(), children: [] } };
  return new LambdaExpensesStack(
    app as unknown as Construct,
    'TestLambdaExpensesStack',
    defaultProps,
  );
}

describe('LambdaExpensesStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImportFromVersion.mockImplementation(
      (_scope: unknown, _v: string, _stack: string, key: string) =>
        `imported-${key}`,
    );
  });

  test('instantiates without throwing', () => {
    expect(() => createStack()).not.toThrow();
  });

  test('exposes api property', () => {
    const stack = createStack();
    expect(stack.api).toBe(mockApi);
  });

  test('imports UserPoolArn from v1 Auth', () => {
    createStack();
    expect(mockImportFromVersion).toHaveBeenCalledWith(
      expect.anything(),
      'v1',
      'Auth',
      'UserPoolArn',
    );
  });

  test('creates /expenses resource on api root', () => {
    createStack();
    expect(mockRootAddResource).toHaveBeenCalledWith('expenses');
  });

  test('adds GET and POST methods on /expenses collection', () => {
    createStack();

    const collectionMethods = mockCollectionAddMethod.mock.calls.map(
      (c: unknown[]) => c[0],
    );
    expect(collectionMethods).toContain('GET');
    expect(collectionMethods).toContain('POST');
  });

  test('creates /expenses/{id} sub-resource', () => {
    createStack();
    expect(mockCollectionResource.addResource).toHaveBeenCalledWith('{id}');
  });

  test('adds GET, PUT, PATCH, DELETE methods on /expenses/{id}', () => {
    createStack();

    const itemMethods = mockItemAddMethod.mock.calls.map(
      (c: unknown[]) => c[0],
    );
    expect(itemMethods).toContain('GET');
    expect(itemMethods).toContain('PUT');
    expect(itemMethods).toContain('PATCH');
    expect(itemMethods).toContain('DELETE');
  });

  test('OPTIONS is NOT added as an explicit method (handled by CORS preflight)', () => {
    createStack();

    const collectionMethods = mockCollectionAddMethod.mock.calls.map(
      (c: unknown[]) => c[0],
    );
    const itemMethods = mockItemAddMethod.mock.calls.map(
      (c: unknown[]) => c[0],
    );
    const allMethods = [...collectionMethods, ...itemMethods];

    expect(allMethods).not.toContain('OPTIONS');
  });

  test('all methods use Cognito authorization', () => {
    createStack();

    const allCalls = [
      ...(mockCollectionAddMethod.mock.calls as unknown[][]),
      ...(mockItemAddMethod.mock.calls as unknown[][]),
    ];

    for (const call of allCalls) {
      const methodOptions = call[2] as Record<string, unknown>;
      expect(methodOptions.authorizationType).toBe('COGNITO');
    }
  });

  test('stackName follows BaseStack convention', () => {
    const stack = createStack();
    expect(stack.stackName).toBe('FinancialManagement-v2-LambdaExpenses');
  });
});
