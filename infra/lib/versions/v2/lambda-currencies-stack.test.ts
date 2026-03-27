import { Construct } from 'constructs';
import { LambdaCurrenciesStack } from './lambda-currencies-stack';
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

const mockAddMethod = jest.fn();
const mockCurrenciesResource = { addMethod: mockAddMethod };
const mockRootAddResource = jest.fn().mockReturnValue(mockCurrenciesResource);
const mockApi = {
  url: 'https://mock-api.execute-api.us-east-1.amazonaws.com/prod/',
  root: { addResource: mockRootAddResource },
};

const mockRequestValidator = { requestValidatorId: 'mock-validator' };

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
  RequestValidator: jest.fn().mockImplementation(() => mockRequestValidator),
  AuthorizationType: { COGNITO: 'COGNITO' },
}));

jest.mock('aws-cdk-lib/aws-cognito', () => ({
  UserPool: {
    fromUserPoolArn: jest.fn().mockReturnValue({ userPoolId: 'mock-pool' }),
  },
}));

const defaultProps = {
  version: 'v2',
  stackName: 'LambdaCurrencies',
  description: 'Test Lambda Currencies stack',
  databaseUrl: 'postgresql://localhost:5432/test',
  allowedOrigins: ['https://dev-financial-management.migudev.com'],
  stage: 'dev',
};

function createStack() {
  const app = { node: { tryGetContext: jest.fn(), children: [] } };
  return new LambdaCurrenciesStack(
    app as unknown as Construct,
    'TestLambdaCurrenciesStack',
    defaultProps,
  );
}

function getApiGatewayMocks() {
  return jest.requireMock<Record<string, jest.Mock>>(
    'aws-cdk-lib/aws-apigateway',
  );
}

describe('LambdaCurrenciesStack', () => {
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

  test('stackName follows BaseStack convention', () => {
    const stack = createStack();
    expect(stack.stackName).toBe('FinancialManagement-v2-LambdaCurrencies');
  });

  test('creates /currencies resource on api root', () => {
    createStack();
    expect(mockRootAddResource).toHaveBeenCalledWith('currencies');
  });

  test('adds GET method on /currencies', () => {
    createStack();
    const methods = mockAddMethod.mock.calls.map((c: unknown[]) => c[0]);
    expect(methods).toContain('GET');
  });

  test('/currencies GET uses Cognito authorization', () => {
    createStack();
    const getCall = mockAddMethod.mock.calls.find(
      (c: unknown[]) => c[0] === 'GET',
    );
    const opts = getCall![2] as Record<string, unknown>;
    expect(opts.authorizationType).toBe('COGNITO');
  });

  test('does not add write methods on /currencies', () => {
    createStack();
    const methods = mockAddMethod.mock.calls.map((c: unknown[]) => c[0]);
    expect(methods).not.toContain('POST');
    expect(methods).not.toContain('PUT');
    expect(methods).not.toContain('PATCH');
    expect(methods).not.toContain('DELETE');
  });

  describe('request validator', () => {
    test('creates one params-only validator', () => {
      createStack();
      const { RequestValidator: MockValidator } = getApiGatewayMocks();
      expect(MockValidator).toHaveBeenCalledTimes(1);
      const validatorProps = (MockValidator as jest.Mock).mock
        .calls[0]![2] as Record<string, unknown>;
      expect(validatorProps.requestValidatorName).toBe(
        'LambdaCurrencies-validate-params',
      );
      expect(validatorProps.validateRequestBody).toBe(false);
      expect(validatorProps.validateRequestParameters).toBe(true);
    });
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

  test('emits CfnOutput for API URL', () => {
    createStack();
    const { CfnOutput: MockCfnOutput } =
      jest.requireMock<Record<string, jest.Mock>>('aws-cdk-lib');
    expect(MockCfnOutput).toHaveBeenCalledTimes(1);
  });
});
