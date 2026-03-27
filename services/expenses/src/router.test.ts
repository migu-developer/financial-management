import { Router } from './router';
import { Application } from '@services/expenses/presentation/application';
import {
  RouteNotFoundError,
  MethodNotImplementedError,
} from '@packages/models/shared/utils/errors';
import type { APIGatewayProxyEvent } from 'src/types';
import type { LoggerService } from '@services/expenses/domain/services/logger';
import type { User } from '@packages/models/users/interface';

jest.useFakeTimers();

function makeMockLogger(): LoggerService {
  return { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
}

function makeApp(httpMethod: string, path: string): Application {
  const event: APIGatewayProxyEvent = {
    httpMethod,
    path,
    resource: path,
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
      httpMethod,
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
      path,
      stage: 'test',
      requestId: 'req-1',
      requestTimeEpoch: 0,
      resourceId: 'res-1',
      resourcePath: path,
    },
  };
  const user: User = { sub: 'u1', email: 'u@test.com' };
  return new Application({ event, logger: makeMockLogger(), user });
}

describe('Router.instantiate', () => {
  it('resolves /expenses without throwing', () => {
    expect(() => Router.instantiate(makeApp('GET', '/expenses'))).not.toThrow();
  });

  it('resolves /expenses/{id} without throwing', () => {
    expect(() =>
      Router.instantiate(makeApp('GET', '/expenses/{id}')),
    ).not.toThrow();
  });

  it('throws RouteNotFoundError for unknown path', () => {
    expect(() => Router.instantiate(makeApp('GET', '/unknown'))).toThrow(
      RouteNotFoundError,
    );
  });

  it('throws RouteNotFoundError for empty path', () => {
    expect(() => Router.instantiate(makeApp('GET', ''))).toThrow(
      RouteNotFoundError,
    );
  });

  it('returns a Router instance', () => {
    expect(Router.instantiate(makeApp('GET', '/expenses'))).toBeInstanceOf(
      Router,
    );
  });
});

describe('Router.dispatch', () => {
  it('GET /expenses returns a Response', async () => {
    const router = Router.instantiate(makeApp('GET', '/expenses'));
    const p = router.dispatch();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
  });

  it('GET /expenses/{id} returns a Response', async () => {
    const router = Router.instantiate(makeApp('GET', '/expenses/{id}'));
    const p = router.dispatch();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
  });

  it('throws MethodNotImplementedError for PUT on /expenses', async () => {
    const router = Router.instantiate(makeApp('PUT', '/expenses'));
    await expect(router.dispatch()).rejects.toThrow(MethodNotImplementedError);
  });

  it('throws MethodNotImplementedError for DELETE on /expenses', async () => {
    const router = Router.instantiate(makeApp('DELETE', '/expenses'));
    await expect(router.dispatch()).rejects.toThrow(MethodNotImplementedError);
  });

  it('PUT /expenses/{id} resolves successfully', async () => {
    const router = Router.instantiate(makeApp('PUT', '/expenses/{id}'));
    const p = router.dispatch();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
  });

  it('DELETE /expenses/{id} resolves successfully', async () => {
    const router = Router.instantiate(makeApp('DELETE', '/expenses/{id}'));
    const p = router.dispatch();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
  });
});
