import { Router } from './router';
import { Application } from '@services/users/presentation/application';
import {
  RouteNotFoundError,
  MethodNotImplementedError,
} from '@packages/models/shared/utils/errors';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import type { LoggerService } from '@services/shared/domain/services/logger';
import type { DatabaseService } from '@services/shared/domain/services/database';
import type { UserProfile } from '@packages/models/users/types';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

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

function makeUser(): UserProfile {
  return {
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
  const user: UserProfile = makeUser();

  return new Application({
    event,
    logger: makeMockLogger(),
    user,
    dbService: makeMockDbService(),
  });
}

const mockUserProfile = {
  id: 'user-1',
  uid: 'uid-123',
  email: 'u@test.com',
  first_name: 'Test',
  last_name: 'User',
  identities: null,
  locale: 'en',
  picture: null,
  phone: null,
  document_id: null,
  email_verified: false,
  phone_verified: false,
  provider_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'u@test.com',
  modified_by: 'u@test.com',
};

// ─── Router.instantiate integration tests ─────────────────────────────────────

describe('Router.instantiate', () => {
  it('resolves exact static route /users', () => {
    expect(() => Router.instantiate(makeApp('GET', '/users'))).not.toThrow();
  });

  it('resolves dynamic route /users/{id} with a UUID', () => {
    expect(() =>
      Router.instantiate(makeApp('GET', `/users/${UUID}`)),
    ).not.toThrow();
  });

  it('resolves dynamic route with a simple string id', () => {
    expect(() =>
      Router.instantiate(makeApp('GET', '/users/my-user-id')),
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

  it('throws RouteNotFoundError when dynamic segment is empty (/users/)', () => {
    expect(() => Router.instantiate(makeApp('GET', '/users/'))).toThrow(
      RouteNotFoundError,
    );
  });

  it('returns a Router instance', () => {
    expect(Router.instantiate(makeApp('GET', '/users'))).toBeInstanceOf(Router);
  });
});

// ─── Router.dispatch integration tests ────────────────────────────────────────

describe('Router.dispatch', () => {
  it('POST /users returns a Response with valid body', async () => {
    const dbService: DatabaseService = {
      query: jest.fn().mockResolvedValue([mockUserProfile]),
      queryReadOnly: jest.fn().mockResolvedValue([]),
      end: jest.fn(),
    };
    const body = JSON.stringify({
      uid: 'uid-123',
      email: 'u@test.com',
      first_name: 'Test',
      last_name: 'User',
    });
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/users',
      resource: '/users',
      body,
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
        httpMethod: 'POST',
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
        path: '/users',
        stage: 'test',
        requestId: 'req-1',
        requestTimeEpoch: 0,
        resourceId: 'res-1',
        resourcePath: '/users',
      },
    };
    const app = new Application({
      event,
      logger: makeMockLogger(),
      user: makeUser(),
      dbService,
    });
    await expect(Router.instantiate(app).dispatch()).resolves.toBeInstanceOf(
      Response,
    );
  });

  it('GET /users/:uuid returns a Response', async () => {
    const dbService: DatabaseService = {
      query: jest.fn(),
      queryReadOnly: jest.fn().mockResolvedValue([mockUserProfile]),
      end: jest.fn(),
    };
    const event: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: `/users/${UUID}`,
      resource: '/users/{id}',
      body: null,
      headers: {},
      multiValueHeaders: {},
      isBase64Encoded: false,
      pathParameters: { id: UUID },
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
        path: `/users/${UUID}`,
        stage: 'test',
        requestId: 'req-1',
        requestTimeEpoch: 0,
        resourceId: 'res-1',
        resourcePath: '/users/{id}',
      },
    };
    const app = new Application({
      event,
      logger: makeMockLogger(),
      user: makeUser(),
      dbService,
    });
    await expect(Router.instantiate(app).dispatch()).resolves.toBeInstanceOf(
      Response,
    );
  });

  it('throws MethodNotImplementedError for GET on /users', async () => {
    const router = Router.instantiate(makeApp('GET', '/users'));
    await expect(router.dispatch()).rejects.toThrow(MethodNotImplementedError);
  });

  it('throws MethodNotImplementedError for PUT on /users', async () => {
    const router = Router.instantiate(makeApp('PUT', '/users'));
    await expect(router.dispatch()).rejects.toThrow(MethodNotImplementedError);
  });

  it('throws MethodNotImplementedError for DELETE on /users', async () => {
    const router = Router.instantiate(makeApp('DELETE', '/users'));
    await expect(router.dispatch()).rejects.toThrow(MethodNotImplementedError);
  });

  it('PATCH /users/:uuid returns a Response with valid body', async () => {
    const patchedUser = { ...mockUserProfile, first_name: 'Patched' };
    const dbService: DatabaseService = {
      query: jest.fn().mockResolvedValue([patchedUser]),
      queryReadOnly: jest.fn().mockResolvedValue([]),
      end: jest.fn(),
    };
    const body = JSON.stringify({ first_name: 'Patched' });
    const event: APIGatewayProxyEvent = {
      httpMethod: 'PATCH',
      path: `/users/${UUID}`,
      resource: '/users/{id}',
      body,
      headers: {},
      multiValueHeaders: {},
      isBase64Encoded: false,
      pathParameters: { id: UUID },
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {
        accountId: '123',
        apiId: 'api-id',
        authorizer: null,
        protocol: 'HTTP/1.1',
        httpMethod: 'PATCH',
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
        path: `/users/${UUID}`,
        stage: 'test',
        requestId: 'req-1',
        requestTimeEpoch: 0,
        resourceId: 'res-1',
        resourcePath: '/users/{id}',
      },
    };
    const app = new Application({
      event,
      logger: makeMockLogger(),
      user: makeUser(),
      dbService,
    });
    await expect(Router.instantiate(app).dispatch()).resolves.toBeInstanceOf(
      Response,
    );
  });
});
