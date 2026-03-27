import { Router } from './router';
import { Application } from '@services/currencies/presentation/application';
import {
  RouteNotFoundError,
  MethodNotImplementedError,
} from '@packages/models/shared/utils/errors';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import type { LoggerService } from '@services/shared/domain/services/logger';
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

// ─── Router.instantiate integration tests ─────────────────────────────────────

describe('Router.instantiate', () => {
  it('resolves exact static route /currencies', () => {
    expect(() =>
      Router.instantiate(makeApp('GET', '/currencies')),
    ).not.toThrow();
  });

  it('throws RouteNotFoundError for completely unknown path', () => {
    expect(() => Router.instantiate(makeApp('GET', '/unknown'))).toThrow(
      RouteNotFoundError,
    );
  });

  it('throws RouteNotFoundError for empty path', () => {
    expect(() => Router.instantiate(makeApp('GET', ''))).toThrow(
      RouteNotFoundError,
    );
  });

  it('throws RouteNotFoundError when dynamic segment is empty (/currencies/)', () => {
    expect(() => Router.instantiate(makeApp('GET', '/currencies/'))).toThrow(
      RouteNotFoundError,
    );
  });

  it('returns a Router instance', () => {
    expect(Router.instantiate(makeApp('GET', '/currencies'))).toBeInstanceOf(
      Router,
    );
  });
});

// ─── Router.dispatch integration tests ────────────────────────────────────────

describe('Router.dispatch', () => {
  it('GET /currencies returns a Response', async () => {
    const router = Router.instantiate(makeApp('GET', '/currencies'));
    const p = router.dispatch();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
  });

  it('throws MethodNotImplementedError for POST on /currencies', async () => {
    const router = Router.instantiate(makeApp('POST', '/currencies'));
    await expect(router.dispatch()).rejects.toThrow(MethodNotImplementedError);
  });

  it('throws MethodNotImplementedError for PUT on /currencies', async () => {
    const router = Router.instantiate(makeApp('PUT', '/currencies'));
    await expect(router.dispatch()).rejects.toThrow(MethodNotImplementedError);
  });

  it('throws MethodNotImplementedError for PATCH on /currencies', async () => {
    const router = Router.instantiate(makeApp('PATCH', '/currencies'));
    await expect(router.dispatch()).rejects.toThrow(MethodNotImplementedError);
  });

  it('throws MethodNotImplementedError for DELETE on /currencies', async () => {
    const router = Router.instantiate(makeApp('DELETE', '/currencies'));
    await expect(router.dispatch()).rejects.toThrow(MethodNotImplementedError);
  });
});
