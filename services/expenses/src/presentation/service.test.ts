import {
  ExpensesService,
  ExpenseService,
  ExpensesTypesService,
  ExpensesCategoriesService,
} from './service';
import { HttpCode } from '@packages/models/shared/utils/http-code';
import { ModuleNotFoundError } from '@packages/models/shared/utils/errors';
import { Application } from './application';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import type { LoggerService } from '@services/shared/domain/services/logger';
import type { DatabaseService } from '@services/shared/domain/services/database';
import type { UserProfile } from '@packages/models/users/types';

function makeMockLogger(): LoggerService {
  return { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
}

function makeMockDbService(): DatabaseService {
  return { query: jest.fn(), queryReadOnly: jest.fn(), end: jest.fn() };
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
  const user: UserProfile = {
    id: 'u1',
    uid: 'u1',
    email: 'u@test.com',
    first_name: 'u',
    last_name: 'u',
    identities: null,
    locale: 'en',
    picture: null,
    phone: null,
    document_id: null,
    email_verified: false,
    phone_verified: false,
    provider_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'u1',
    modified_by: 'u1',
  };
  return new Application({ event, logger: makeMockLogger(), user, dbService });
}

const mockExpense = {
  id: 'exp-1',
  user_id: 'user-1',
  name: 'Groceries',
  value: 50000,
  currency_id: 'cur-1',
  expense_type_id: 'type-1',
  expense_category_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'u@test.com',
  modified_by: 'u@test.com',
};

const validBody = JSON.stringify({
  name: 'Groceries',
  value: 50000,
  currency_id: 'cur-1',
  expense_type_id: 'type-1',
});

describe('ExpensesService', () => {
  it('executeGET returns 200 with paginated expenses from db', async () => {
    const dbService: DatabaseService = {
      query: jest.fn(),
      queryReadOnly: jest.fn().mockResolvedValue([mockExpense]),
      end: jest.fn(),
    };
    const response = await new ExpensesService(
      makeApp({}, dbService),
    ).executeGET();
    expect(response.status).toBe(HttpCode.SUCCESS);
    const body = (await response.json()) as {
      success: boolean;
      data: unknown[];
      has_more: boolean;
      next_cursor: string | null;
    };
    expect(body.success).toBe(true);
    expect(body.data).toEqual([mockExpense]);
    expect(body.has_more).toBe(false);
    expect(body.next_cursor).toBeNull();
  });

  it('executeGET propagates db errors', async () => {
    const dbService: DatabaseService = {
      query: jest.fn(),
      queryReadOnly: jest.fn().mockRejectedValue(new Error('DB error')),
      end: jest.fn(),
    };
    await expect(
      new ExpensesService(makeApp({}, dbService)).executeGET(),
    ).rejects.toThrow('DB error');
  });

  it('executePOST returns 200 with created expense', async () => {
    const dbService: DatabaseService = {
      query: jest.fn().mockResolvedValue([mockExpense]),
      queryReadOnly: jest.fn(),
      end: jest.fn(),
    };
    const response = await new ExpensesService(
      makeApp({ body: validBody }, dbService),
    ).executePOST();
    expect(response.status).toBe(HttpCode.SUCCESS);
    const json = (await response.json()) as { success: boolean; data: unknown };
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockExpense);
  });

  it('executePOST propagates db errors', async () => {
    const dbService: DatabaseService = {
      query: jest.fn().mockRejectedValue(new Error('insert failed')),
      queryReadOnly: jest.fn(),
      end: jest.fn(),
    };
    await expect(
      new ExpensesService(
        makeApp({ body: validBody }, dbService),
      ).executePOST(),
    ).rejects.toThrow('insert failed');
  });
});

describe('ExpenseService', () => {
  it('executeGET returns 200 with expense from db', async () => {
    const dbService: DatabaseService = {
      query: jest.fn(),
      queryReadOnly: jest.fn().mockResolvedValue([mockExpense]),
      end: jest.fn(),
    };
    const app = makeApp({ pathParameters: { id: 'exp-1' } }, dbService);
    const response = await new ExpenseService(app).executeGET();
    expect(response.status).toBe(HttpCode.SUCCESS);
    const json = (await response.json()) as { success: boolean; data: unknown };
    expect(json.data).toEqual(mockExpense);
  });

  it('executeGET throws ModuleNotFoundError when expense not found', async () => {
    const dbService: DatabaseService = {
      query: jest.fn(),
      queryReadOnly: jest.fn().mockResolvedValue([]),
      end: jest.fn(),
    };
    const app = makeApp({ pathParameters: { id: 'missing-id' } }, dbService);
    await expect(new ExpenseService(app).executeGET()).rejects.toThrow(
      ModuleNotFoundError,
    );
  });
});

describe('ExpenseService — PUT', () => {
  it('executePUT returns 200 with updated expense', async () => {
    const updatedExpense = { ...mockExpense, name: 'Updated' };
    const dbService: DatabaseService = {
      query: jest.fn().mockResolvedValue([updatedExpense]),
      queryReadOnly: jest.fn(),
      end: jest.fn(),
    };
    const app = makeApp(
      { pathParameters: { id: 'exp-1' }, body: validBody },
      dbService,
    );
    const response = await new ExpenseService(app).executePUT();
    expect(response.status).toBe(HttpCode.SUCCESS);
    const json = (await response.json()) as { success: boolean; data: unknown };
    expect(json.success).toBe(true);
    expect(json.data).toEqual(updatedExpense);
  });

  it('executePUT propagates db errors', async () => {
    const dbService: DatabaseService = {
      query: jest.fn().mockRejectedValue(new Error('update failed')),
      queryReadOnly: jest.fn(),
      end: jest.fn(),
    };
    const app = makeApp(
      { pathParameters: { id: 'exp-1' }, body: validBody },
      dbService,
    );
    await expect(new ExpenseService(app).executePUT()).rejects.toThrow(
      'update failed',
    );
  });
});

describe('ExpenseService — PATCH', () => {
  it('executePATCH returns 200 with patched expense', async () => {
    const patchedExpense = { ...mockExpense, name: 'Patched' };
    const dbService: DatabaseService = {
      query: jest.fn().mockResolvedValue([patchedExpense]),
      queryReadOnly: jest.fn(),
      end: jest.fn(),
    };
    const body = JSON.stringify({ name: 'Patched' });
    const app = makeApp({ pathParameters: { id: 'exp-1' }, body }, dbService);
    const response = await new ExpenseService(app).executePATCH();
    expect(response.status).toBe(HttpCode.SUCCESS);
    const json = (await response.json()) as { success: boolean; data: unknown };
    expect(json.success).toBe(true);
    expect(json.data).toEqual(patchedExpense);
  });

  it('executePATCH propagates db errors', async () => {
    const dbService: DatabaseService = {
      query: jest.fn().mockRejectedValue(new Error('patch failed')),
      queryReadOnly: jest.fn(),
      end: jest.fn(),
    };
    const body = JSON.stringify({ value: 100 });
    const app = makeApp({ pathParameters: { id: 'exp-1' }, body }, dbService);
    await expect(new ExpenseService(app).executePATCH()).rejects.toThrow(
      'patch failed',
    );
  });
});

describe('ExpenseService — DELETE', () => {
  it('executeDELETE returns 200 on success', async () => {
    const dbService: DatabaseService = {
      query: jest.fn().mockResolvedValue([{ id: 'exp-1' }]),
      queryReadOnly: jest.fn(),
      end: jest.fn(),
    };
    const app = makeApp({ pathParameters: { id: 'exp-1' } }, dbService);
    const response = await new ExpenseService(app).executeDELETE();
    expect(response.status).toBe(HttpCode.SUCCESS);
    const json = (await response.json()) as { success: boolean };
    expect(json.success).toBe(true);
  });

  it('executeDELETE propagates ModuleNotFoundError when expense not found', async () => {
    const dbService: DatabaseService = {
      query: jest.fn().mockResolvedValue([]),
      queryReadOnly: jest.fn(),
      end: jest.fn(),
    };
    const app = makeApp({ pathParameters: { id: 'missing' } }, dbService);
    await expect(new ExpenseService(app).executeDELETE()).rejects.toThrow(
      ModuleNotFoundError,
    );
  });
});

describe('ExpensesTypesService', () => {
  it('executeGET returns 200 with expense types from db', async () => {
    const types = [{ id: 't-1', name: 'income', description: 'Ingreso' }];
    const dbService: DatabaseService = {
      query: jest.fn(),
      queryReadOnly: jest.fn().mockResolvedValue(types),
      end: jest.fn(),
    };
    const response = await new ExpensesTypesService(
      makeApp({}, dbService),
    ).executeGET();
    expect(response.status).toBe(HttpCode.SUCCESS);
    const json = (await response.json()) as { success: boolean; data: unknown };
    expect(json.data).toEqual(types);
  });

  it('executeGET propagates db errors', async () => {
    const dbService: DatabaseService = {
      query: jest.fn(),
      queryReadOnly: jest.fn().mockRejectedValue(new Error('DB error')),
      end: jest.fn(),
    };
    await expect(
      new ExpensesTypesService(makeApp({}, dbService)).executeGET(),
    ).rejects.toThrow('DB error');
  });
});

describe('ExpensesCategoriesService', () => {
  it('executeGET returns 200 with expense categories from db', async () => {
    const categories = [{ id: 'c-1', name: 'Food', description: 'Meals' }];
    const dbService: DatabaseService = {
      query: jest.fn(),
      queryReadOnly: jest.fn().mockResolvedValue(categories),
      end: jest.fn(),
    };
    const response = await new ExpensesCategoriesService(
      makeApp({}, dbService),
    ).executeGET();
    expect(response.status).toBe(HttpCode.SUCCESS);
    const json = (await response.json()) as { success: boolean; data: unknown };
    expect(json.data).toEqual(categories);
  });

  it('executeGET propagates db errors', async () => {
    const dbService: DatabaseService = {
      query: jest.fn(),
      queryReadOnly: jest.fn().mockRejectedValue(new Error('DB error')),
      end: jest.fn(),
    };
    await expect(
      new ExpensesCategoriesService(makeApp({}, dbService)).executeGET(),
    ).rejects.toThrow('DB error');
  });
});
