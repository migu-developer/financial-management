import { Construct } from 'constructs';
import { ApiDocsStack } from './api-docs-stack';

const mockAddResource = jest.fn();
const mockCreateVersion = jest.fn();

jest.mock('./api-docs', () => ({
  ApiDocumentation: jest.fn().mockImplementation(() => ({
    addResource: mockAddResource,
    createVersion: mockCreateVersion,
  })),
}));

jest.mock('./api-gateway-stack', () => ({}));

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

const mockGateway = {
  api: { restApiId: 'mock-api-id' },
};

const mockDeps = { getStack: jest.fn().mockReturnValue(mockGateway) };

const defaultProps = {
  version: 'v2',
  stackName: 'ApiDocs',
  description: 'Test API docs stack',
  deps: mockDeps,
};

function createStack() {
  const app = { node: { tryGetContext: jest.fn(), children: [] } };
  return new ApiDocsStack(
    app as unknown as Construct,
    'TestApiDocsStack',
    defaultProps,
  );
}

describe('ApiDocsStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeps.getStack.mockReturnValue(mockGateway);
  });

  test('instantiates without throwing', () => {
    expect(() => createStack()).not.toThrow();
  });

  test('gets gateway from deps', () => {
    createStack();
    expect(mockDeps.getStack).toHaveBeenCalledWith('ApiGateway');
  });

  test('documents all 10 resources', () => {
    createStack();
    expect(mockAddResource).toHaveBeenCalledTimes(10);

    const paths = mockAddResource.mock.calls.map(
      (c: unknown[]) => (c[0] as { path: string }).path,
    );
    expect(paths).toContain('/');
    expect(paths).toContain('/expenses');
    expect(paths).toContain('/expenses/{id}');
    expect(paths).toContain('/expenses/types');
    expect(paths).toContain('/expenses/categories');
    expect(paths).toContain('/expenses/metrics');
    expect(paths).toContain('/users');
    expect(paths).toContain('/users/{id}');
    expect(paths).toContain('/currencies');
  });

  test('documents /documents resource', () => {
    createStack();
    const paths = mockAddResource.mock.calls.map(
      (c: unknown[]) => (c[0] as { path: string }).path,
    );
    expect(paths).toContain('/documents');
  });

  test('/expenses GET includes pagination query parameters', () => {
    createStack();
    const expensesCall = mockAddResource.mock.calls.find(
      (c: unknown[]) => (c[0] as { path: string }).path === '/expenses',
    );
    const doc = expensesCall![0] as {
      methods: Array<{
        method: string;
        queryParameters?: Array<{ name: string }>;
      }>;
    };
    const getMethod = doc.methods.find((m) => m.method === 'GET');
    expect(getMethod).toBeDefined();
    expect(getMethod!.queryParameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'limit' }),
        expect.objectContaining({ name: 'cursor' }),
      ]),
    );
  });

  test('/expenses/{id} documents GET, PUT, PATCH, DELETE', () => {
    createStack();
    const call = mockAddResource.mock.calls.find(
      (c: unknown[]) => (c[0] as { path: string }).path === '/expenses/{id}',
    );
    const doc = call![0] as {
      methods: Array<{ method: string }>;
    };
    const methods = doc.methods.map((m) => m.method);
    expect(methods).toEqual(['GET', 'PUT', 'PATCH', 'DELETE']);
  });

  test('/users documents POST only', () => {
    createStack();
    const call = mockAddResource.mock.calls.find(
      (c: unknown[]) => (c[0] as { path: string }).path === '/users',
    );
    const doc = call![0] as {
      methods: Array<{ method: string }>;
    };
    expect(doc.methods).toHaveLength(1);
    expect(doc.methods[0]!.method).toBe('POST');
  });

  test('/users/{id} documents GET and PATCH', () => {
    createStack();
    const call = mockAddResource.mock.calls.find(
      (c: unknown[]) => (c[0] as { path: string }).path === '/users/{id}',
    );
    const doc = call![0] as {
      methods: Array<{ method: string }>;
    };
    const methods = doc.methods.map((m) => m.method);
    expect(methods).toEqual(['GET', 'PATCH']);
  });

  test('creates documentation version 1.0.0', () => {
    createStack();
    expect(mockCreateVersion).toHaveBeenCalledTimes(1);
    expect(mockCreateVersion).toHaveBeenCalledWith(
      '1.0.0',
      'Initial API documentation',
    );
  });

  test('stackName follows BaseStack convention', () => {
    const stack = createStack();
    expect(stack.stackName).toBe('FinancialManagement-v2-ApiDocs');
  });
});
