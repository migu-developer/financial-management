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
const mockTypesAddMethod = jest.fn();
const mockCategoriesAddMethod = jest.fn();
const mockItemResource = { addMethod: mockItemAddMethod };
const mockTypesResource = { addMethod: mockTypesAddMethod };
const mockCategoriesResource = { addMethod: mockCategoriesAddMethod };
const mockCollectionResource = {
  addMethod: mockCollectionAddMethod,
  addResource: jest.fn().mockImplementation((name: string) => {
    if (name === 'types') return mockTypesResource;
    if (name === 'categories') return mockCategoriesResource;
    return mockItemResource;
  }),
};
const mockRootAddResource = jest.fn().mockReturnValue(mockCollectionResource);
const mockApi = {
  url: 'https://mock-api.execute-api.us-east-1.amazonaws.com/prod/',
  root: { addResource: mockRootAddResource },
};

const mockRequestValidator = { requestValidatorId: 'mock-validator' };
const mockModel = { modelId: 'mock-model' };

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
  Model: jest.fn().mockImplementation(() => mockModel),
  GatewayResponse: jest.fn(),
  ResponseType: {
    BAD_REQUEST_BODY: 'BAD_REQUEST_BODY',
    BAD_REQUEST_PARAMETERS: 'BAD_REQUEST_PARAMETERS',
    UNAUTHORIZED: 'UNAUTHORIZED',
    ACCESS_DENIED: 'ACCESS_DENIED',
  },
  AuthorizationType: { COGNITO: 'COGNITO' },
  JsonSchemaType: {
    OBJECT: 'object',
    STRING: 'string',
    NUMBER: 'number',
  },
  JsonSchemaVersion: { DRAFT4: 'http://json-schema.org/draft-04/schema#' },
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
  stage: 'dev',
};

function createStack() {
  const app = { node: { tryGetContext: jest.fn(), children: [] } };
  return new LambdaExpensesStack(
    app as unknown as Construct,
    'TestLambdaExpensesStack',
    defaultProps,
  );
}

function getApiGatewayMocks() {
  return jest.requireMock<Record<string, jest.Mock>>(
    'aws-cdk-lib/aws-apigateway',
  );
}

describe('LambdaExpensesStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImportFromVersion.mockImplementation(
      (_scope: unknown, _v: string, _stack: string, key: string) =>
        `imported-${key}`,
    );
    mockCollectionResource.addResource.mockImplementation((name: string) => {
      if (name === 'types') return mockTypesResource;
      if (name === 'categories') return mockCategoriesResource;
      return mockItemResource;
    });
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

  test('OPTIONS is NOT added as explicit method (handled by CORS preflight)', () => {
    createStack();
    const collectionMethods = mockCollectionAddMethod.mock.calls.map(
      (c: unknown[]) => c[0],
    );
    const itemMethods = mockItemAddMethod.mock.calls.map(
      (c: unknown[]) => c[0],
    );
    expect([...collectionMethods, ...itemMethods]).not.toContain('OPTIONS');
  });

  test('all methods use Cognito authorization', () => {
    createStack();
    const allCalls = [
      ...(mockCollectionAddMethod.mock.calls as unknown[][]),
      ...(mockItemAddMethod.mock.calls as unknown[][]),
    ];
    for (const call of allCalls) {
      const opts = call[2] as Record<string, unknown>;
      expect(opts.authorizationType).toBe('COGNITO');
    }
  });

  test('stackName follows BaseStack convention', () => {
    const stack = createStack();
    expect(stack.stackName).toBe('FinancialManagement-v2-LambdaExpenses');
  });

  describe('custom error responses', () => {
    test('creates gateway responses for validation errors, auth, and access denied', () => {
      createStack();
      const { GatewayResponse: MockGatewayResponse } = getApiGatewayMocks();
      const GwMock = MockGatewayResponse as jest.Mock;
      expect(GwMock).toHaveBeenCalledTimes(4);

      const types = GwMock.mock.calls.map(
        (c: unknown[]) => (c[2] as Record<string, unknown>).type,
      );
      expect(types).toContain('BAD_REQUEST_BODY');
      expect(types).toContain('BAD_REQUEST_PARAMETERS');
      expect(types).toContain('UNAUTHORIZED');
      expect(types).toContain('ACCESS_DENIED');
    });

    test('validation error response includes error detail template', () => {
      createStack();
      const { GatewayResponse: MockGatewayResponse } = getApiGatewayMocks();
      const GwMock = MockGatewayResponse as jest.Mock;

      const bodyErrorCall = GwMock.mock.calls.find(
        (c: unknown[]) =>
          (c[2] as Record<string, unknown>).type === 'BAD_REQUEST_BODY',
      );
      const templates = (bodyErrorCall![2] as Record<string, unknown>)
        .templates as Record<string, string>;
      const parsed = JSON.parse(templates['application/json']!) as Record<
        string,
        string
      >;
      expect(parsed.code).toBe('VALIDATION_ERROR');
      expect(parsed.message).toContain('$context.error.validationErrorString');
    });

    test('all error responses include CORS header', () => {
      createStack();
      const { GatewayResponse: MockGatewayResponse } = getApiGatewayMocks();
      const GwMock = MockGatewayResponse as jest.Mock;

      for (const call of GwMock.mock.calls as unknown[][]) {
        const headers = (call[2] as Record<string, unknown>)
          .responseHeaders as Record<string, string>;
        expect(headers['Access-Control-Allow-Origin']).toBeDefined();
      }
    });
  });

  describe('request validators', () => {
    test('creates three request validators', () => {
      createStack();
      const { RequestValidator: MockValidator } = getApiGatewayMocks();
      expect(MockValidator).toHaveBeenCalledTimes(3);

      const names = (MockValidator as jest.Mock).mock.calls.map(
        (c: unknown[]) =>
          (c[2] as Record<string, unknown>).requestValidatorName,
      );
      expect(names).toContain('LambdaExpenses-validate-body');
      expect(names).toContain('LambdaExpenses-validate-params');
      expect(names).toContain('LambdaExpenses-validate-body-and-params');
    });
  });

  describe('request models (JSON Schema)', () => {
    test('creates CreateExpense and PatchExpense models', () => {
      createStack();
      const { Model: MockModel } = getApiGatewayMocks();
      const ModelMock = MockModel as jest.Mock;
      expect(ModelMock).toHaveBeenCalledTimes(3);

      const modelNames = ModelMock.mock.calls.map(
        (c: unknown[]) => (c[2] as Record<string, unknown>).modelName,
      );
      expect(modelNames).toContain('CreateExpense');
      expect(modelNames).toContain('PatchExpense');
      expect(modelNames).toContain('UpdateExpense');
    });

    test('CreateExpense model has required fields matching DB schema', () => {
      createStack();
      const { Model: MockModel } = getApiGatewayMocks();
      const createCall = (MockModel as jest.Mock).mock.calls.find(
        (c: unknown[]) =>
          (c[2] as Record<string, unknown>).modelName === 'CreateExpense',
      );
      const schema = (createCall![2] as Record<string, unknown>)
        .schema as Record<string, unknown>;

      expect(schema.required).toEqual([
        'user_id',
        'name',
        'value',
        'currency_id',
        'expense_type_id',
      ]);
      expect(schema.additionalProperties).toBe(false);

      const properties = schema.properties as Record<
        string,
        Record<string, unknown>
      >;
      expect(properties.user_id).toBeDefined();
      expect(properties.name).toBeDefined();
      expect(properties.value).toBeDefined();
      expect(properties.currency_id).toBeDefined();
      expect(properties.expense_type_id).toBeDefined();
      expect(properties.expense_category_id).toBeDefined();
    });

    test('CreateExpense model validates UUID pattern on foreign keys', () => {
      createStack();
      const { Model: MockModel } = getApiGatewayMocks();
      const createCall = (MockModel as jest.Mock).mock.calls.find(
        (c: unknown[]) =>
          (c[2] as Record<string, unknown>).modelName === 'CreateExpense',
      );
      const schema = (createCall![2] as Record<string, unknown>)
        .schema as Record<string, unknown>;
      const properties = schema.properties as Record<
        string,
        Record<string, unknown>
      >;

      const uuidFields = [
        'user_id',
        'currency_id',
        'expense_type_id',
        'expense_category_id',
      ];
      for (const field of uuidFields) {
        expect(properties[field]!.pattern).toMatch(/\^\[0-9a-f\]/);
      }
    });

    test('CreateExpense model validates value > 0', () => {
      createStack();
      const { Model: MockModel } = getApiGatewayMocks();
      const createCall = (MockModel as jest.Mock).mock.calls.find(
        (c: unknown[]) =>
          (c[2] as Record<string, unknown>).modelName === 'CreateExpense',
      );
      const schema = (createCall![2] as Record<string, unknown>)
        .schema as Record<string, unknown>;
      const properties = schema.properties as Record<
        string,
        Record<string, unknown>
      >;

      expect(properties.value!.minimum).toBe(0);
      expect(properties.value!.exclusiveMinimum).toBe(true);
    });

    test('PatchExpense model has no required fields but minProperties: 1', () => {
      createStack();
      const { Model: MockModel } = getApiGatewayMocks();
      const patchCall = (MockModel as jest.Mock).mock.calls.find(
        (c: unknown[]) =>
          (c[2] as Record<string, unknown>).modelName === 'PatchExpense',
      );
      const schema = (patchCall![2] as Record<string, unknown>)
        .schema as Record<string, unknown>;

      expect(schema.required).toBeUndefined();
      expect(schema.minProperties).toBe(1);
      expect(schema.additionalProperties).toBe(false);
    });
  });

  describe('/expenses/types and /expenses/categories resources', () => {
    test('creates /expenses/types sub-resource', () => {
      createStack();
      expect(mockCollectionResource.addResource).toHaveBeenCalledWith('types');
    });

    test('adds GET method on /expenses/types', () => {
      createStack();
      const methods = mockTypesAddMethod.mock.calls.map((c: unknown[]) => c[0]);
      expect(methods).toContain('GET');
    });

    test('/expenses/types GET uses Cognito authorization', () => {
      createStack();
      const getCall = mockTypesAddMethod.mock.calls.find(
        (c: unknown[]) => c[0] === 'GET',
      );
      const opts = getCall![2] as Record<string, unknown>;
      expect(opts.authorizationType).toBe('COGNITO');
    });

    test('/expenses/types does not expose write methods', () => {
      createStack();
      const methods = mockTypesAddMethod.mock.calls.map((c: unknown[]) => c[0]);
      expect(methods).not.toContain('POST');
      expect(methods).not.toContain('PUT');
      expect(methods).not.toContain('PATCH');
      expect(methods).not.toContain('DELETE');
    });

    test('creates /expenses/categories sub-resource', () => {
      createStack();
      expect(mockCollectionResource.addResource).toHaveBeenCalledWith(
        'categories',
      );
    });

    test('adds GET method on /expenses/categories', () => {
      createStack();
      const methods = mockCategoriesAddMethod.mock.calls.map(
        (c: unknown[]) => c[0],
      );
      expect(methods).toContain('GET');
    });

    test('/expenses/categories GET uses Cognito authorization', () => {
      createStack();
      const getCall = mockCategoriesAddMethod.mock.calls.find(
        (c: unknown[]) => c[0] === 'GET',
      );
      const opts = getCall![2] as Record<string, unknown>;
      expect(opts.authorizationType).toBe('COGNITO');
    });

    test('/expenses/categories does not expose write methods', () => {
      createStack();
      const methods = mockCategoriesAddMethod.mock.calls.map(
        (c: unknown[]) => c[0],
      );
      expect(methods).not.toContain('POST');
      expect(methods).not.toContain('PUT');
      expect(methods).not.toContain('PATCH');
      expect(methods).not.toContain('DELETE');
    });
  });

  describe('method-specific validation', () => {
    test('POST /expenses uses body validator with CreateExpense model', () => {
      createStack();
      const postCall = mockCollectionAddMethod.mock.calls.find(
        (c: unknown[]) => c[0] === 'POST',
      );
      const opts = postCall![2] as Record<string, unknown>;
      expect(opts.requestValidator).toBe(mockRequestValidator);
      expect(opts.requestModels).toEqual({
        'application/json': mockModel,
      });
    });

    test('PUT /expenses/{id} uses body+params validator with UpdateExpense model', () => {
      createStack();
      const putCall = mockItemAddMethod.mock.calls.find(
        (c: unknown[]) => c[0] === 'PUT',
      );
      const opts = putCall![2] as Record<string, unknown>;
      expect(opts.requestValidator).toBe(mockRequestValidator);
      expect(opts.requestModels).toEqual({
        'application/json': mockModel,
      });
    });

    test('PATCH /expenses/{id} uses body+params validator with PatchExpense model', () => {
      createStack();
      const patchCall = mockItemAddMethod.mock.calls.find(
        (c: unknown[]) => c[0] === 'PATCH',
      );
      const opts = patchCall![2] as Record<string, unknown>;
      expect(opts.requestValidator).toBe(mockRequestValidator);
      expect(opts.requestModels).toEqual({
        'application/json': mockModel,
      });
    });

    test('GET and DELETE do not have requestModels', () => {
      createStack();

      const getCollection = mockCollectionAddMethod.mock.calls.find(
        (c: unknown[]) => c[0] === 'GET',
      );
      const getItem = mockItemAddMethod.mock.calls.find(
        (c: unknown[]) => c[0] === 'GET',
      );
      const deleteItem = mockItemAddMethod.mock.calls.find(
        (c: unknown[]) => c[0] === 'DELETE',
      );

      expect(
        (getCollection![2] as Record<string, unknown>).requestModels,
      ).toBeUndefined();
      expect(
        (getItem![2] as Record<string, unknown>).requestModels,
      ).toBeUndefined();
      expect(
        (deleteItem![2] as Record<string, unknown>).requestModels,
      ).toBeUndefined();
    });
  });
});
