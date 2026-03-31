import { UsersController, UserController } from './controller';
import { MethodNotImplementedError } from '@packages/models/shared/utils/errors';
import { Application } from './application';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import type { LoggerService } from '@services/shared/domain/services/logger';
import type { DatabaseService } from '@services/shared/domain/services/database';
import type { UserProfile } from '@packages/models/users/types';

function makeMockLogger(): LoggerService {
  return { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
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
    path: '/users',
    resource: '/users',
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
      path: '/users',
      stage: 'test',
      requestId: 'req-1',
      requestTimeEpoch: 0,
      resourceId: 'res-1',
      resourcePath: '/users',
    },
    ...overrides,
  };
  const user: UserProfile = makeUser();
  return new Application({
    event,
    logger: makeMockLogger(),
    user,
    dbService,
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

describe('UsersController', () => {
  it('POST returns a Response with valid body', async () => {
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
    await expect(
      new UsersController(makeApp({ body }, dbService)).POST(),
    ).resolves.toBeInstanceOf(Response);
  });

  it('GET throws MethodNotImplementedError', () => {
    expect(() => new UsersController(makeApp()).GET()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('PUT throws MethodNotImplementedError', () => {
    expect(() => new UsersController(makeApp()).PUT()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('PATCH throws MethodNotImplementedError', () => {
    expect(() => new UsersController(makeApp()).PATCH()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('DELETE throws MethodNotImplementedError', () => {
    expect(() => new UsersController(makeApp()).DELETE()).toThrow(
      MethodNotImplementedError,
    );
  });
});

describe('UserController', () => {
  it('GET returns a Response when user is found', async () => {
    const dbService: DatabaseService = {
      query: jest.fn(),
      queryReadOnly: jest.fn().mockResolvedValue([mockUserProfile]),
      end: jest.fn(),
    };
    const app = new Application({
      event: {
        httpMethod: 'GET',
        path: '/users/uid-123',
        resource: '/users/{id}',
        body: null,
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        pathParameters: { id: 'uid-123' },
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
          path: '/users/uid-123',
          stage: 'test',
          requestId: 'req-1',
          requestTimeEpoch: 0,
          resourceId: 'res-1',
          resourcePath: '/users/{id}',
        },
      } as APIGatewayProxyEvent,
      logger: makeMockLogger(),
      user: makeUser(),
      dbService,
    });
    await expect(new UserController(app).GET()).resolves.toBeInstanceOf(
      Response,
    );
  });

  it('PATCH returns a Response with valid body', async () => {
    const dbService: DatabaseService = {
      query: jest.fn().mockResolvedValue([mockUserProfile]),
      queryReadOnly: jest.fn().mockResolvedValue([]),
      end: jest.fn(),
    };
    const body = JSON.stringify({ first_name: 'Patched' });
    await expect(
      new UserController(
        makeApp({ pathParameters: { id: 'uid-123' }, body }, dbService),
      ).PATCH(),
    ).resolves.toBeInstanceOf(Response);
  });

  it('POST throws MethodNotImplementedError', () => {
    expect(() => new UserController(makeApp()).POST()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('PUT throws MethodNotImplementedError', () => {
    expect(() => new UserController(makeApp()).PUT()).toThrow(
      MethodNotImplementedError,
    );
  });

  it('DELETE throws MethodNotImplementedError', () => {
    expect(() => new UserController(makeApp()).DELETE()).toThrow(
      MethodNotImplementedError,
    );
  });
});
