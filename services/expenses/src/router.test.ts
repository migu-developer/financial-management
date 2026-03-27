import { Router, matchRoute } from './router';
import { Application } from '@services/expenses/presentation/application';
import {
  RouteNotFoundError,
  MethodNotImplementedError,
} from '@packages/models/shared/utils/errors';
import type { APIGatewayProxyEvent } from 'src/types';
import type { LoggerService } from '@services/expenses/domain/services/logger';
import type { User } from '@packages/models/users/interface';

jest.useFakeTimers();

const UUID = '550e8400-e29b-41d4-a716-446655440000';

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

// ─── matchRoute unit tests ────────────────────────────────────────────────────

describe('matchRoute', () => {
  describe('static routes', () => {
    it('matches identical static paths', () => {
      expect(matchRoute('/expenses', '/expenses')).toBe(true);
    });

    it('does not match different static paths', () => {
      expect(matchRoute('/expenses', '/invoices')).toBe(false);
    });

    it('does not match when pathname has extra segment', () => {
      expect(matchRoute('/expenses', '/expenses/extra')).toBe(false);
    });

    it('does not match when pattern has extra segment', () => {
      expect(matchRoute('/expenses/extra', '/expenses')).toBe(false);
    });
  });

  describe('single dynamic segment {id}', () => {
    it('matches a UUID', () => {
      expect(matchRoute('/expenses/{id}', `/expenses/${UUID}`)).toBe(true);
    });

    it('matches any non-empty string', () => {
      expect(matchRoute('/expenses/{id}', '/expenses/abc')).toBe(true);
    });

    it('does not match when dynamic segment is empty', () => {
      expect(matchRoute('/expenses/{id}', '/expenses/')).toBe(false);
    });

    it('does not match when path has no dynamic segment', () => {
      expect(matchRoute('/expenses/{id}', '/expenses')).toBe(false);
    });
  });

  describe('multiple dynamic segments', () => {
    it('matches /a/{id}/b/{id} with two UUIDs', () => {
      expect(matchRoute('/a/{id}/b/{id}', `/a/${UUID}/b/${UUID}`)).toBe(true);
    });

    it('matches /name1/{id}/name2/{id}/name3/{id}', () => {
      expect(
        matchRoute(
          '/name1/{id}/name2/{id}/name3/{id}',
          '/name1/x/name2/y/name3/z',
        ),
      ).toBe(true);
    });

    it('does not match when one dynamic segment is empty', () => {
      expect(matchRoute('/a/{id}/b/{id}', `/a/${UUID}/b/`)).toBe(false);
    });

    it('does not match when segment count differs', () => {
      expect(matchRoute('/a/{id}/b/{id}', `/a/${UUID}/b`)).toBe(false);
    });

    it('requires static segments to match exactly', () => {
      expect(matchRoute('/a/{id}/b/{id}', `/a/${UUID}/c/${UUID}`)).toBe(false);
    });
  });

  describe('mixed static and dynamic segments', () => {
    it('matches /expenses/{id}/details with real value', () => {
      expect(
        matchRoute('/expenses/{id}/details', `/expenses/${UUID}/details`),
      ).toBe(true);
    });

    it('does not match when static suffix differs', () => {
      expect(
        matchRoute('/expenses/{id}/details', `/expenses/${UUID}/summary`),
      ).toBe(false);
    });
  });
});

// ─── Router.instantiate integration tests ─────────────────────────────────────

describe('Router.instantiate', () => {
  it('resolves exact static route /expenses', () => {
    expect(() => Router.instantiate(makeApp('GET', '/expenses'))).not.toThrow();
  });

  it('resolves dynamic route /expenses/{id} with a UUID', () => {
    expect(() =>
      Router.instantiate(makeApp('GET', `/expenses/${UUID}`)),
    ).not.toThrow();
  });

  it('resolves dynamic route with a simple string id', () => {
    expect(() =>
      Router.instantiate(makeApp('GET', '/expenses/my-expense-id')),
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

  it('throws RouteNotFoundError when dynamic segment is empty (/expenses/)', () => {
    expect(() => Router.instantiate(makeApp('GET', '/expenses/'))).toThrow(
      RouteNotFoundError,
    );
  });

  it('returns a Router instance', () => {
    expect(Router.instantiate(makeApp('GET', '/expenses'))).toBeInstanceOf(
      Router,
    );
  });
});

// ─── Router.dispatch integration tests ────────────────────────────────────────

describe('Router.dispatch', () => {
  it('GET /expenses returns a Response', async () => {
    const router = Router.instantiate(makeApp('GET', '/expenses'));
    const p = router.dispatch();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
  });

  it('GET /expenses/:uuid returns a Response', async () => {
    const router = Router.instantiate(makeApp('GET', `/expenses/${UUID}`));
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

  it('PUT /expenses/:uuid resolves successfully', async () => {
    const router = Router.instantiate(makeApp('PUT', `/expenses/${UUID}`));
    const p = router.dispatch();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
  });

  it('DELETE /expenses/:uuid resolves successfully', async () => {
    const router = Router.instantiate(makeApp('DELETE', `/expenses/${UUID}`));
    const p = router.dispatch();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
  });

  it('PATCH /expenses/:uuid resolves successfully', async () => {
    const router = Router.instantiate(makeApp('PATCH', `/expenses/${UUID}`));
    const p = router.dispatch();
    jest.runAllTimers();
    await expect(p).resolves.toBeInstanceOf(Response);
  });
});
