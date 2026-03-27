import { Application } from './application';
import type { APIGatewayProxyEvent } from 'src/types';
import type { LoggerService } from '@services/expenses/domain/services/logger';
import type { User } from '@packages/models/users/interface';

function makeMockLogger(): LoggerService {
  return { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
}

function makeUser(): User {
  return { sub: 'user-123', email: 'test@example.com' };
}

function makeEvent(
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/expenses',
    resource: '/expenses',
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
      path: '/expenses',
      stage: 'test',
      requestId: 'req-1',
      requestTimeEpoch: 0,
      resourceId: 'res-1',
      resourcePath: '/expenses',
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
    });
    expect(app.method).toBe('POST');
  });

  it('extracts path from event', () => {
    const app = new Application({
      event: makeEvent({ path: '/expenses/abc' }),
      logger: makeMockLogger(),
      user: makeUser(),
    });
    expect(app.pathname).toBe('/expenses/abc');
  });

  it('stores the original event', () => {
    const event = makeEvent();
    const app = new Application({
      event,
      logger: makeMockLogger(),
      user: makeUser(),
    });
    expect(app.event).toBe(event);
  });

  it('stores the logger', () => {
    const logger = makeMockLogger();
    const app = new Application({
      event: makeEvent(),
      logger,
      user: makeUser(),
    });
    expect(app.logger).toBe(logger);
  });

  it('stores the user', () => {
    const user = makeUser();
    const app = new Application({
      event: makeEvent(),
      logger: makeMockLogger(),
      user,
    });
    expect(app.user).toBe(user);
  });

  it('routes include /expenses and /expenses/{id}', () => {
    const app = new Application({
      event: makeEvent(),
      logger: makeMockLogger(),
      user: makeUser(),
    });
    expect(app.routes).toContain('/expenses');
    expect(app.routes).toContain('/expenses/{id}');
  });

  it('routes count matches modules count', () => {
    const app = new Application({
      event: makeEvent(),
      logger: makeMockLogger(),
      user: makeUser(),
    });
    expect(app.routes.length).toBe(app.modules.length);
  });
});
