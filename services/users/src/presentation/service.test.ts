import { UsersService, UserService } from './service';
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

const validBody = JSON.stringify({
  uid: 'uid-123',
  email: 'u@test.com',
  first_name: 'Test',
  last_name: 'User',
});

describe('UsersService', () => {
  it('executePOST returns 200 with created user', async () => {
    const dbService: DatabaseService = {
      query: jest.fn().mockResolvedValue([mockUserProfile]),
      queryReadOnly: jest.fn(),
      end: jest.fn(),
    };
    const response = await new UsersService(
      makeApp({ body: validBody }, dbService),
    ).executePOST();
    expect(response.status).toBe(HttpCode.SUCCESS);
    const json = (await response.json()) as { success: boolean; data: unknown };
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockUserProfile);
  });

  it('executePOST propagates db errors', async () => {
    const dbService: DatabaseService = {
      query: jest.fn().mockRejectedValue(new Error('insert failed')),
      queryReadOnly: jest.fn(),
      end: jest.fn(),
    };
    await expect(
      new UsersService(makeApp({ body: validBody }, dbService)).executePOST(),
    ).rejects.toThrow('insert failed');
  });
});

describe('UserService', () => {
  it('executeGET returns 200 with user from db', async () => {
    const dbService: DatabaseService = {
      query: jest.fn(),
      queryReadOnly: jest.fn().mockResolvedValue([mockUserProfile]),
      end: jest.fn(),
    };
    const app = makeApp({ pathParameters: { id: 'uid-123' } }, dbService);
    const response = await new UserService(app).executeGET();
    expect(response.status).toBe(HttpCode.SUCCESS);
    const json = (await response.json()) as { success: boolean; data: unknown };
    expect(json.data).toEqual(mockUserProfile);
  });

  it('executeGET throws ModuleNotFoundError when user not found', async () => {
    const dbService: DatabaseService = {
      query: jest.fn(),
      queryReadOnly: jest.fn().mockResolvedValue([]),
      end: jest.fn(),
    };
    const app = makeApp({ pathParameters: { id: 'missing-id' } }, dbService);
    await expect(new UserService(app).executeGET()).rejects.toThrow(
      ModuleNotFoundError,
    );
  });
});

describe('UserService — PATCH', () => {
  it('executePATCH returns 200 with patched user', async () => {
    const patchedUser = { ...mockUserProfile, first_name: 'Patched' };
    const dbService: DatabaseService = {
      query: jest.fn().mockResolvedValue([patchedUser]),
      queryReadOnly: jest.fn(),
      end: jest.fn(),
    };
    const body = JSON.stringify({ first_name: 'Patched' });
    const app = makeApp({ pathParameters: { id: 'uid-123' }, body }, dbService);
    const response = await new UserService(app).executePATCH();
    expect(response.status).toBe(HttpCode.SUCCESS);
    const json = (await response.json()) as { success: boolean; data: unknown };
    expect(json.success).toBe(true);
    expect(json.data).toEqual(patchedUser);
  });

  it('executePATCH propagates db errors', async () => {
    const dbService: DatabaseService = {
      query: jest.fn().mockRejectedValue(new Error('patch failed')),
      queryReadOnly: jest.fn(),
      end: jest.fn(),
    };
    const body = JSON.stringify({ first_name: 'Patched' });
    const app = makeApp({ pathParameters: { id: 'uid-123' }, body }, dbService);
    await expect(new UserService(app).executePATCH()).rejects.toThrow(
      'patch failed',
    );
  });
});
