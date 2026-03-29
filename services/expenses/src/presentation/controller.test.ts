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
import type { User } from '@packages/models/users/interface';

jest.useFakeTimers();

function makeMockLogger(): LoggerService {
  return { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
}

function makeApp(): Application {
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
  };
  const user: User = { sub: 'u1', email: 'u@test.com' };
  return new Application({ event, logger: makeMockLogger(), user });
}

describe('ExpensesController', () => {
  it('GET returns a Response', async () => {
    const ctrl = new ExpensesController(makeApp());
    const p = ctrl.GET();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
  });

  it('POST returns a Response', async () => {
    const ctrl = new ExpensesController(makeApp());
    const p = ctrl.POST();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
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
  it('GET returns a Response', async () => {
    const ctrl = new ExpenseController(makeApp());
    const p = ctrl.GET();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
  });

  it('POST throws MethodNotImplementedError', () => {
    expect(() => new ExpenseController(makeApp()).POST()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('PUT returns a Response', async () => {
    const ctrl = new ExpenseController(makeApp());
    const p = ctrl.PUT();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
  });

  it('PATCH returns a Response', async () => {
    const ctrl = new ExpenseController(makeApp());
    const p = ctrl.PATCH();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
  });

  it('DELETE returns a Response', async () => {
    const ctrl = new ExpenseController(makeApp());
    const p = ctrl.DELETE();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
  });
});

describe('ExpensesTypesController', () => {
  it('GET returns a Response', async () => {
    const ctrl = new ExpensesTypesController(makeApp());
    const p = ctrl.GET();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
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
    const ctrl = new ExpensesCategoriesController(makeApp());
    const p = ctrl.GET();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
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
