import { Construct } from 'constructs';
import { LambdaUsersStack } from './lambda-users-stack';

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

const mockItemAddMethod = jest.fn();
const mockCollectionAddMethod = jest.fn();

const mockItemResource = { addMethod: mockItemAddMethod };
const mockCollectionResource = {
  addMethod: mockCollectionAddMethod,
  addResource: jest.fn().mockReturnValue(mockItemResource),
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
  stackName: 'LambdaUsers',
  description: 'Test Lambda Users stack',
  databaseUrl: 'postgresql://localhost:5432/test',
  databaseReadonlyUrl: 'postgresql://localhost:5432/test',
  allowedOrigins: ['https://dev-financial-management.migudev.com'],
  deps: mockDeps,
};

function createStack() {
  const app = { node: { tryGetContext: jest.fn(), children: [] } };
  return new LambdaUsersStack(
    app as unknown as Construct,
    'TestLambdaUsersStack',
    defaultProps,
  );
}

describe('LambdaUsersStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollectionResource.addResource.mockReturnValue(mockItemResource);
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

  test('stackName follows BaseStack convention', () => {
    const stack = createStack();
    expect(stack.stackName).toBe('FinancialManagement-v2-LambdaUsers');
  });

  test('creates /users resource on api root', () => {
    createStack();
    expect(mockGateway.api.root.addResource).toHaveBeenCalledWith('users');
  });

  test('creates /users/{id} sub-resource', () => {
    createStack();
    expect(mockCollectionResource.addResource).toHaveBeenCalledWith('{id}');
  });

  test('adds POST on /users collection', () => {
    createStack();
    const methods = mockCollectionAddMethod.mock.calls.map(
      (c: unknown[]) => c[0],
    );
    expect(methods).toContain('POST');
  });

  test('adds GET and PATCH on /users/{id}', () => {
    createStack();
    const methods = mockItemAddMethod.mock.calls.map((c: unknown[]) => c[0]);
    expect(methods).toContain('GET');
    expect(methods).toContain('PATCH');
  });

  test('does not add PUT or DELETE methods', () => {
    createStack();
    const collectionMethods = mockCollectionAddMethod.mock.calls.map(
      (c: unknown[]) => c[0],
    );
    const itemMethods = mockItemAddMethod.mock.calls.map(
      (c: unknown[]) => c[0],
    );
    const allMethods = [...collectionMethods, ...itemMethods];
    expect(allMethods).not.toContain('PUT');
    expect(allMethods).not.toContain('DELETE');
  });

  test('OPTIONS is NOT added as explicit method', () => {
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

  describe('request models (JSON Schema)', () => {
    test('creates 2 models (CreateUser, PatchUser) via gateway.createModel', () => {
      createStack();
      expect(mockGateway.createModel).toHaveBeenCalledTimes(2);

      const modelNames = mockGateway.createModel.mock.calls.map(
        (c: unknown[]) => c[1],
      );
      expect(modelNames).toContain('CreateUser');
      expect(modelNames).toContain('PatchUser');
    });

    test('CreateUser schema requires uid and email', () => {
      createStack();
      const createCall = mockGateway.createModel.mock.calls.find(
        (c: unknown[]) => c[1] === 'CreateUser',
      );
      const schema = createCall![2] as Record<string, unknown>;

      expect(schema.required).toEqual(['uid', 'email']);
      expect(schema.additionalProperties).toBe(false);
    });

    test('CreateUser schema has all expected properties', () => {
      createStack();
      const createCall = mockGateway.createModel.mock.calls.find(
        (c: unknown[]) => c[1] === 'CreateUser',
      );
      const schema = createCall![2] as Record<string, unknown>;
      const properties = schema.properties as Record<
        string,
        Record<string, unknown>
      >;

      expect(properties.uid).toBeDefined();
      expect(properties.email).toBeDefined();
      expect(properties.first_name).toBeDefined();
      expect(properties.last_name).toBeDefined();
      expect(properties.locale).toBeDefined();
      expect(properties.picture).toBeDefined();
      expect(properties.identities).toBeDefined();
      expect(properties.provider_id).toBeDefined();
    });

    test('CreateUser validates UUID pattern on uid and provider_id', () => {
      createStack();
      const createCall = mockGateway.createModel.mock.calls.find(
        (c: unknown[]) => c[1] === 'CreateUser',
      );
      const schema = createCall![2] as Record<string, unknown>;
      const properties = schema.properties as Record<
        string,
        Record<string, unknown>
      >;

      const uuidFields = ['uid', 'provider_id'];
      for (const field of uuidFields) {
        expect(properties[field]!.pattern).toMatch(/\^\[0-9a-f\]/);
      }
    });

    test('PatchUser schema has no required fields but minProperties: 1', () => {
      createStack();
      const patchCall = mockGateway.createModel.mock.calls.find(
        (c: unknown[]) => c[1] === 'PatchUser',
      );
      const schema = patchCall![2] as Record<string, unknown>;

      expect(schema.required).toBeUndefined();
      expect(schema.minProperties).toBe(1);
      expect(schema.additionalProperties).toBe(false);
    });

    test('PatchUser validates UUID pattern on document_id', () => {
      createStack();
      const patchCall = mockGateway.createModel.mock.calls.find(
        (c: unknown[]) => c[1] === 'PatchUser',
      );
      const schema = patchCall![2] as Record<string, unknown>;
      const properties = schema.properties as Record<
        string,
        Record<string, unknown>
      >;

      expect(properties.document_id!.pattern).toMatch(/\^\[0-9a-f\]/);
    });
  });

  describe('method-specific validation', () => {
    test('POST /users uses authWithBody with CreateUser model', () => {
      createStack();
      const postCall = mockCollectionAddMethod.mock.calls.find(
        (c: unknown[]) => c[0] === 'POST',
      );
      expect(postCall![2]).toBe(mockAuthWithBody);
      expect(mockGateway.authWithBody).toHaveBeenCalled();
    });

    test('PATCH /users/{id} uses authWithBodyAndParams with PatchUser model', () => {
      createStack();
      const patchCall = mockItemAddMethod.mock.calls.find(
        (c: unknown[]) => c[0] === 'PATCH',
      );
      expect(patchCall![2]).toBe(mockAuthWithBodyAndParams);
      expect(mockGateway.authWithBodyAndParams).toHaveBeenCalled();
    });

    test('GET /users/{id} uses authOnly (no requestModels)', () => {
      createStack();
      const getCall = mockItemAddMethod.mock.calls.find(
        (c: unknown[]) => c[0] === 'GET',
      );
      expect(getCall![2]).toBe(mockAuthOnly);
      expect(
        (mockAuthOnly as Record<string, unknown>).requestModels,
      ).toBeUndefined();
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
});
