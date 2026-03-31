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

function makeEvent(
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent {
  return {
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
    ...overrides,
  };
}

describe('Application', () => {
  it('extracts httpMethod from event', () => {
    const app = new Application({
      event: makeEvent({ httpMethod: 'POST' }),
      logger: makeMockLogger(),
      user: makeUser(),
      dbService: makeMockDbService(),
    });
    expect(app.method).toBe('POST');
  });

  it('extracts path from event', () => {
    const app = new Application({
      event: makeEvent({ path: '/currencies/abc' }),
      logger: makeMockLogger(),
      user: makeUser(),
      dbService: makeMockDbService(),
    });
    expect(app.pathname).toBe('/currencies/abc');
  });

  it('stores the original event', () => {
    const event = makeEvent();
    const app = new Application({
      event,
      logger: makeMockLogger(),
      user: makeUser(),
      dbService: makeMockDbService(),
    });
    expect(app.event).toBe(event);
  });

  it('stores the logger', () => {
    const logger = makeMockLogger();
    const app = new Application({
      event: makeEvent(),
      logger,
      user: makeUser(),
      dbService: makeMockDbService(),
    });
    expect(app.logger).toBe(logger);
  });

  it('stores the user', () => {
    const user = makeUser();
    const app = new Application({
      event: makeEvent(),
      logger: makeMockLogger(),
      user,
      dbService: makeMockDbService(),
    });
    expect(app.user).toBe(user);
  });

  it('stores the dbService', () => {
    const dbService = makeMockDbService();
    const app = new Application({
      event: makeEvent(),
      logger: makeMockLogger(),
      user: makeUser(),
      dbService,
    });
    expect(app.dbService).toBe(dbService);
  });

  it('routes include /currencies', () => {
    const app = new Application({
      event: makeEvent(),
      logger: makeMockLogger(),
      user: makeUser(),
      dbService: makeMockDbService(),
    });
    expect(app.routes).toContain('/currencies');
  });

  it('routes count matches modules count', () => {
    const app = new Application({
      event: makeEvent(),
      logger: makeMockLogger(),
      user: makeUser(),
      dbService: makeMockDbService(),
    });
    expect(app.routes.length).toBe(app.modules.length);
  });
});
