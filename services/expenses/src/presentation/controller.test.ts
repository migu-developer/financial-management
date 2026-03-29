import {
  ExpensesController,
  ExpenseController,
  ExpensesTypesController,
  ExpensesCategoriesController,
} from './controller';
import { MethodNotImplementedError } from '@packages/models/shared/utils/errors';
import { Application } from './application';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import type { LoggerService } from '@services/shared/domain/services/logger';
import type { DatabaseService } from '@services/shared/domain/services/database';
import type { User } from '@packages/models/users/interface';

function makeMockLogger(): LoggerService {
  return { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
}

function makeMockDbService(): DatabaseService {
  return {
    query: jest.fn().mockResolvedValue([]),
    queryReadOnly: jest.fn().mockResolvedValue([]),
    end: jest.fn(),
  };
}

function makeApp(
  overrides: Partial<APIGatewayProxyEvent> = {},
  dbService: DatabaseService = makeMockDbService(),
): Application {
  const event: APIGatewayProxyEvent = {
    httpMethod: 'GET',
    path: '/expenses',
    resource: '/expenses',
    body: null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123',
      apiId: 'api-id',
      authorizer: null,
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: null,
        userArn: null,
      },
      path: '/expenses',
      stage: 'test',
      requestId: 'req-1',
      requestTimeEpoch: 0,
      resourceId: 'res-1',
      resourcePath: '/expenses',
    },
    ...overrides,
  };
  const user: User = { sub: 'uid-123', email: 'u@test.com' };
  return new Application({
    event,
    logger: makeMockLogger(),
    user,
    dbService,
  });
}

const mockExpense = {
  id: 'exp-1',
  user_id: 'user-1',
  name: 'Test',
  value: 100,
  currency_id: 'cur-1',
  expense_type_id: 'type-1',
  expense_category_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: null,
  modified_by: null,
};

describe('ExpensesController', () => {
  it('GET returns a Response', async () => {
    await expect(
      new ExpensesController(makeApp()).GET(),
    ).resolves.toBeInstanceOf(Response);
  });

  it('POST returns a Response with valid body', async () => {
    const body = JSON.stringify({
      name: 'Test',
      value: 100,
      currency_id: 'cur-1',
      expense_type_id: 'type-1',
    });
    await expect(
      new ExpensesController(makeApp({ body })).POST(),
    ).resolves.toBeInstanceOf(Response);
  });

  it('PUT throws MethodNotImplementedError', () => {
    expect(() => new ExpensesController(makeApp()).PUT()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('PATCH throws MethodNotImplementedError', () => {
    expect(() => new ExpensesController(makeApp()).PATCH()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('DELETE throws MethodNotImplementedError', () => {
    expect(() => new ExpensesController(makeApp()).DELETE()).toThrow(
      MethodNotImplementedError,
    );
  });
});

describe('ExpenseController', () => {
  it('GET returns a Response when expense is found', async () => {
    const dbService: DatabaseService = {
      query: jest.fn(),
      queryReadOnly: jest.fn().mockResolvedValue([mockExpense]),
      end: jest.fn(),
    };
    const app = new Application({
      event: {
        httpMethod: 'GET',
        path: '/expenses/exp-1',
        resource: '/expenses/{id}',
        body: null,
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        pathParameters: { id: 'exp-1' },
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {
          accountId: '123',
          apiId: 'api-id',
          authorizer: null,
          protocol: 'HTTP/1.1',
          httpMethod: 'GET',
          identity: {
            accessKey: null,
            accountId: null,
            apiKey: null,
            apiKeyId: null,
            caller: null,
            clientCert: null,
            cognitoAuthenticationProvider: null,
            cognitoAuthenticationType: null,
            cognitoIdentityId: null,
            cognitoIdentityPoolId: null,
            principalOrgId: null,
            sourceIp: '127.0.0.1',
            user: null,
            userAgent: null,
            userArn: null,
          },
          path: '/expenses/exp-1',
          stage: 'test',
          requestId: 'req-1',
          requestTimeEpoch: 0,
          resourceId: 'res-1',
          resourcePath: '/expenses/{id}',
        },
      } as APIGatewayProxyEvent,
      logger: makeMockLogger(),
      user: { sub: 'uid-123', email: 'u@test.com' },
      dbService,
    });
    await expect(new ExpenseController(app).GET()).resolves.toBeInstanceOf(
      Response,
    );
  });

  it('POST throws MethodNotImplementedError', () => {
    expect(() => new ExpenseController(makeApp()).POST()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('PUT returns a Response with valid body', async () => {
    const dbService: DatabaseService = {
      query: jest.fn().mockResolvedValue([mockExpense]),
      queryReadOnly: jest.fn().mockResolvedValue([]),
      end: jest.fn(),
    };
    const body = JSON.stringify({
      name: 'Updated',
      value: 200,
      currency_id: 'cur-1',
      expense_type_id: 'type-1',
    });
    await expect(
      new ExpenseController(
        makeApp({ pathParameters: { id: 'exp-1' }, body }, dbService),
      ).PUT(),
    ).resolves.toBeInstanceOf(Response);
  });

  it('PATCH returns a Response with valid body', async () => {
    const dbService: DatabaseService = {
      query: jest.fn().mockResolvedValue([mockExpense]),
      queryReadOnly: jest.fn().mockResolvedValue([]),
      end: jest.fn(),
    };
    const body = JSON.stringify({ name: 'Patched' });
    await expect(
      new ExpenseController(
        makeApp({ pathParameters: { id: 'exp-1' }, body }, dbService),
      ).PATCH(),
    ).resolves.toBeInstanceOf(Response);
  });

  it('DELETE returns a Response when expense is found', async () => {
    const dbService: DatabaseService = {
      query: jest.fn().mockResolvedValue([{ id: 'exp-1' }]),
      queryReadOnly: jest.fn().mockResolvedValue([]),
      end: jest.fn(),
    };
    const app = new Application({
      event: {
        httpMethod: 'DELETE',
        path: '/expenses/exp-1',
        resource: '/expenses/{id}',
        body: null,
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        pathParameters: { id: 'exp-1' },
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {
          accountId: '123',
          apiId: 'api-id',
          authorizer: null,
          protocol: 'HTTP/1.1',
          httpMethod: 'DELETE',
          identity: {
            accessKey: null,
            accountId: null,
            apiKey: null,
            apiKeyId: null,
            caller: null,
            clientCert: null,
            cognitoAuthenticationProvider: null,
            cognitoAuthenticationType: null,
            cognitoIdentityId: null,
            cognitoIdentityPoolId: null,
            principalOrgId: null,
            sourceIp: '127.0.0.1',
            user: null,
            userAgent: null,
            userArn: null,
          },
          path: '/expenses/exp-1',
          stage: 'test',
          requestId: 'req-1',
          requestTimeEpoch: 0,
          resourceId: 'res-1',
          resourcePath: '/expenses/{id}',
        },
      } as APIGatewayProxyEvent,
      logger: makeMockLogger(),
      user: { sub: 'uid-123', email: 'u@test.com' },
      dbService,
    });
    await expect(new ExpenseController(app).DELETE()).resolves.toBeInstanceOf(
      Response,
    );
  });
});

describe('ExpensesTypesController', () => {
  it('GET returns a Response', async () => {
    await expect(
      new ExpensesTypesController(makeApp()).GET(),
    ).resolves.toBeInstanceOf(Response);
  });

  it('POST throws MethodNotImplementedError', () => {
    expect(() => new ExpensesTypesController(makeApp()).POST()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('PUT throws MethodNotImplementedError', () => {
    expect(() => new ExpensesTypesController(makeApp()).PUT()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('PATCH throws MethodNotImplementedError', () => {
    expect(() => new ExpensesTypesController(makeApp()).PATCH()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('DELETE throws MethodNotImplementedError', () => {
    expect(() => new ExpensesTypesController(makeApp()).DELETE()).toThrow(
      MethodNotImplementedError,
    );
  });
});

describe('ExpensesCategoriesController', () => {
  it('GET returns a Response', async () => {
    await expect(
      new ExpensesCategoriesController(makeApp()).GET(),
    ).resolves.toBeInstanceOf(Response);
  });

  it('POST throws MethodNotImplementedError', () => {
    expect(() => new ExpensesCategoriesController(makeApp()).POST()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('PUT throws MethodNotImplementedError', () => {
    expect(() => new ExpensesCategoriesController(makeApp()).PUT()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('PATCH throws MethodNotImplementedError', () => {
    expect(() => new ExpensesCategoriesController(makeApp()).PATCH()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('DELETE throws MethodNotImplementedError', () => {
    expect(() => new ExpensesCategoriesController(makeApp()).DELETE()).toThrow(
      MethodNotImplementedError,
    );
  });
});
