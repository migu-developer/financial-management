import { Service } from './service';
import { ServiceNotImplementedError } from '@packages/models/shared/utils/errors';
import { Application } from '@services/users/presentation/application';
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

function makeApp(): Application {
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

describe('Service (default wrappers)', () => {
  it('stores application in constructor', () => {
    const app = makeApp();
    expect(new Service(app).application).toBe(app);
  });

  it('executeGET throws ServiceNotImplementedError', async () => {
    await expect(new Service(makeApp()).executeGET()).rejects.toThrow(
      ServiceNotImplementedError,
    );
  });

  it('executePOST throws ServiceNotImplementedError', async () => {
    await expect(new Service(makeApp()).executePOST()).rejects.toThrow(
      ServiceNotImplementedError,
    );
  });

  it('executePUT throws ServiceNotImplementedError', async () => {
    await expect(new Service(makeApp()).executePUT()).rejects.toThrow(
      ServiceNotImplementedError,
    );
  });

  it('executePATCH throws ServiceNotImplementedError', async () => {
    await expect(new Service(makeApp()).executePATCH()).rejects.toThrow(
      ServiceNotImplementedError,
    );
  });

  it('executeDELETE throws ServiceNotImplementedError', async () => {
    await expect(new Service(makeApp()).executeDELETE()).rejects.toThrow(
      ServiceNotImplementedError,
    );
  });
});
