import { Router } from './router';
import { Application } from '@services/documents/presentation/application';
import {
  RouteNotFoundError,
  MethodNotImplementedError,
} from '@packages/models/shared/utils/errors';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import type { LoggerService } from '@services/shared/domain/services/logger';
import type { DatabaseService } from '@services/shared/domain/services/database';
import type { UserProfile } from '@packages/models/users/types';

function makeMockLogger(): LoggerService {
  return { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
}

function makeMockDbService(): DatabaseService {
  return {
    query: jest.fn(),
    queryReadOnly: jest.fn().mockResolvedValue([{ id: 'uuid-1', name: 'CC' }]),
    end: jest.fn(),
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
  return new Application({
    event,
    logger: makeMockLogger(),
    user,
    dbService: makeMockDbService(),
  });
}

// ─── Router.instantiate integration tests ─────────────────────────────────────

describe('Router.instantiate', () => {
  it('resolves exact static route /documents', () => {
    expect(() =>
      Router.instantiate(makeApp('GET', '/documents')),
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

  it('throws RouteNotFoundError when dynamic segment is empty (/documents/)', () => {
    expect(() => Router.instantiate(makeApp('GET', '/documents/'))).toThrow(
      RouteNotFoundError,
    );
  });

  it('returns a Router instance', () => {
    expect(Router.instantiate(makeApp('GET', '/documents'))).toBeInstanceOf(
      Router,
    );
  });
});

// ─── Router.dispatch integration tests ────────────────────────────────────────

describe('Router.dispatch', () => {
  it('GET /documents returns a Response', async () => {
    const router = Router.instantiate(makeApp('GET', '/documents'));
    await expect(router.dispatch()).resolves.toBeInstanceOf(Response);
  });

  it('throws MethodNotImplementedError for POST on /documents', async () => {
    const router = Router.instantiate(makeApp('POST', '/documents'));
    await expect(router.dispatch()).rejects.toThrow(MethodNotImplementedError);
  });

  it('throws MethodNotImplementedError for PUT on /documents', async () => {
    const router = Router.instantiate(makeApp('PUT', '/documents'));
    await expect(router.dispatch()).rejects.toThrow(MethodNotImplementedError);
  });

  it('throws MethodNotImplementedError for PATCH on /documents', async () => {
    const router = Router.instantiate(makeApp('PATCH', '/documents'));
    await expect(router.dispatch()).rejects.toThrow(MethodNotImplementedError);
  });

  it('throws MethodNotImplementedError for DELETE on /documents', async () => {
    const router = Router.instantiate(makeApp('DELETE', '/documents'));
    await expect(router.dispatch()).rejects.toThrow(MethodNotImplementedError);
  });
});
