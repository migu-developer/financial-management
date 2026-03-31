import { Construct } from 'constructs';
import { LambdaExpensesStack } from './lambda-expenses-stack';

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

const mockModel = { modelId: 'mock-model' };
const mockAuthOnly = { authorizationType: 'COGNITO' };
const mockAuthWithBody = {
  authorizationType: 'COGNITO',
  requestModels: { 'application/json': mockModel },
};
const mockAuthWithBodyAndParams = {
  authorizationType: 'COGNITO',
  requestModels: { 'application/json': mockModel },
};

const mockGateway = {
  api: {
    root: { addResource: jest.fn().mockReturnValue(mockCollectionResource) },
  },
  createModel: jest.fn().mockReturnValue(mockModel),
  authOnly: jest.fn().mockReturnValue(mockAuthOnly),
  authWithBody: jest.fn().mockReturnValue(mockAuthWithBody),
  authWithBodyAndParams: jest.fn().mockReturnValue(mockAuthWithBodyAndParams),
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
  JsonSchemaType: {
    OBJECT: 'object',
    STRING: 'string',
    NUMBER: 'number',
  },
  JsonSchemaVersion: { DRAFT4: 'http://json-schema.org/draft-04/schema#' },
}));

const defaultProps = {
  version: 'v2',
  stackName: 'LambdaExpenses',
  description: 'Test Lambda Expenses stack',
  databaseUrl: 'postgresql://localhost:5432/test',
  databaseReadonlyUrl: 'postgresql://localhost:5432/test',
  allowedOrigins: ['https://dev-financial-management.migudev.com'],
  deps: mockDeps,
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
    mockCollectionResource.addResource.mockImplementation((name: string) => {
      if (name === 'types') return mockTypesResource;
      if (name === 'categories') return mockCategoriesResource;
      return mockItemResource;
    });
    mockGateway.api.root.addResource.mockReturnValue(mockCollectionResource);
    mockGateway.createModel.mockReturnValue(mockModel);
    mockGateway.authOnly.mockReturnValue(mockAuthOnly);
    mockGateway.authWithBody.mockReturnValue(mockAuthWithBody);
    mockGateway.authWithBodyAndParams.mockReturnValue(
      mockAuthWithBodyAndParams,
    );
    mockDeps.getStack.mockReturnValue(mockGateway);
  });

  test('instantiates without throwing', () => {
    expect(() => createStack()).not.toThrow();
  });

  test('gets gateway from deps', () => {
    createStack();
    expect(mockDeps.getStack).toHaveBeenCalledWith('ApiGateway');
  });

  test('creates /expenses resource on api root', () => {
    createStack();
    expect(mockGateway.api.root.addResource).toHaveBeenCalledWith('expenses');
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
      ...(mockTypesAddMethod.mock.calls as unknown[][]),
      ...(mockCategoriesAddMethod.mock.calls as unknown[][]),
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

  describe('request models (JSON Schema)', () => {
    test('creates 3 models (CreateExpense, UpdateExpense, PatchExpense) via gateway.createModel', () => {
      createStack();
      expect(mockGateway.createModel).toHaveBeenCalledTimes(3);

      const modelNames = mockGateway.createModel.mock.calls.map(
        (c: unknown[]) => c[1],
      );
      expect(modelNames).toContain('CreateExpense');
      expect(modelNames).toContain('UpdateExpense');
      expect(modelNames).toContain('PatchExpense');
    });

    test('CreateExpense model has required fields matching DB schema', () => {
      createStack();
      const createCall = mockGateway.createModel.mock.calls.find(
        (c: unknown[]) => c[1] === 'CreateExpense',
      );
      const schema = createCall![2] as Record<string, unknown>;

      expect(schema.required).toEqual([
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
      expect(properties.name).toBeDefined();
      expect(properties.value).toBeDefined();
      expect(properties.currency_id).toBeDefined();
      expect(properties.expense_type_id).toBeDefined();
      expect(properties.expense_category_id).toBeDefined();
    });

    test('CreateExpense model validates UUID pattern on foreign keys', () => {
      createStack();
      const createCall = mockGateway.createModel.mock.calls.find(
        (c: unknown[]) => c[1] === 'CreateExpense',
      );
      const schema = createCall![2] as Record<string, unknown>;
      const properties = schema.properties as Record<
        string,
        Record<string, unknown>
      >;

      const uuidFields = [
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
      const createCall = mockGateway.createModel.mock.calls.find(
        (c: unknown[]) => c[1] === 'CreateExpense',
      );
      const schema = createCall![2] as Record<string, unknown>;
      const properties = schema.properties as Record<
        string,
        Record<string, unknown>
      >;

      expect(properties.value!.minimum).toBe(0);
      expect(properties.value!.exclusiveMinimum).toBe(true);
    });

    test('PatchExpense model has no required fields but minProperties: 1', () => {
      createStack();
      const patchCall = mockGateway.createModel.mock.calls.find(
        (c: unknown[]) => c[1] === 'PatchExpense',
      );
      const schema = patchCall![2] as Record<string, unknown>;

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
    test('POST /expenses uses authWithBody with CreateExpense model', () => {
      createStack();
      const postCall = mockCollectionAddMethod.mock.calls.find(
        (c: unknown[]) => c[0] === 'POST',
      );
      const opts = postCall![2] as Record<string, unknown>;
      expect(opts).toBe(mockAuthWithBody);
      expect(mockGateway.authWithBody).toHaveBeenCalled();
    });

    test('PUT /expenses/{id} uses authWithBodyAndParams with UpdateExpense model', () => {
      createStack();
      const putCall = mockItemAddMethod.mock.calls.find(
        (c: unknown[]) => c[0] === 'PUT',
      );
      const opts = putCall![2] as Record<string, unknown>;
      expect(opts).toBe(mockAuthWithBodyAndParams);
      expect(mockGateway.authWithBodyAndParams).toHaveBeenCalled();
    });

    test('PATCH /expenses/{id} uses authWithBodyAndParams with PatchExpense model', () => {
      createStack();
      const patchCall = mockItemAddMethod.mock.calls.find(
        (c: unknown[]) => c[0] === 'PATCH',
      );
      const opts = patchCall![2] as Record<string, unknown>;
      expect(opts).toBe(mockAuthWithBodyAndParams);
    });

    test('GET and DELETE use authOnly (no requestModels)', () => {
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

      expect(getCollection![2]).toBe(mockAuthOnly);
      expect(getItem![2]).toBe(mockAuthOnly);
      expect(deleteItem![2]).toBe(mockAuthOnly);

      expect(
        (mockAuthOnly as Record<string, unknown>).requestModels,
      ).toBeUndefined();
    });
  });
});
