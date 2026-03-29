import { CurrenciesController } from './controller';
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
    query: jest.fn(),
    queryReadOnly: jest.fn().mockResolvedValue([
      {
        id: 'uuid-1',
        code: 'COP',
        name: 'Peso Colombiano',
        symbol: '$',
        country: 'Colombia',
      },
    ]),
    end: jest.fn(),
  };
}

function makeApp(): Application {
  const event: APIGatewayProxyEvent = {
    httpMethod: 'GET',
    path: '/currencies',
    resource: '/currencies',
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
      path: '/currencies',
      stage: 'test',
      requestId: 'req-1',
      requestTimeEpoch: 0,
      resourceId: 'res-1',
      resourcePath: '/currencies',
    },
  };
  const user: User = { sub: 'u1', email: 'u@test.com' };
  return new Application({
    event,
    logger: makeMockLogger(),
    user,
    dbService: makeMockDbService(),
  });
}

describe('CurrenciesController', () => {
  it('GET returns a Response', async () => {
    const ctrl = new CurrenciesController(makeApp());
    await expect(ctrl.GET()).resolves.toBeInstanceOf(Response);
  });

  it('POST returns a Response', () => {
    expect(() => new CurrenciesController(makeApp()).POST()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('PUT throws MethodNotImplementedError', () => {
    expect(() => new CurrenciesController(makeApp()).PUT()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('PATCH throws MethodNotImplementedError', () => {
    expect(() => new CurrenciesController(makeApp()).PATCH()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('DELETE throws MethodNotImplementedError', () => {
    expect(() => new CurrenciesController(makeApp()).DELETE()).toThrow(
      MethodNotImplementedError,
    );
  });
});
