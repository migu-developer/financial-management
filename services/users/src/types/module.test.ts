import type { ModuleType } from './module';
import { ROUTES } from '@services/users/presentation/router';
import { Application } from '@services/users/presentation/application';
import { Controller } from './controller';
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

describe('ModuleType contract', () => {
  it('ROUTES entries satisfy the ModuleType interface shape', () => {
    for (const route of ROUTES) {
      const mod: ModuleType = route;
      expect(typeof mod.url).toBe('string');
      expect(typeof mod.controller).toBe('function');
    }
  });

  it('controller factory receives Application and returns a Controller', () => {
    const app = makeApp();
    for (const route of ROUTES) {
      const ctrl = route.controller(app);
      expect(ctrl).toBeInstanceOf(Controller);
    }
  });

  it('each controller factory produces an independent instance per call', () => {
    const app = makeApp();
    const route = ROUTES[0];
    if (!route) throw new Error('No routes defined');
    const ctrl1 = route.controller(app);
    const ctrl2 = route.controller(app);
    expect(ctrl1).not.toBe(ctrl2);
  });

  it('controller factory for /users creates a controller with the provided app', () => {
    const app = makeApp();
    const route = ROUTES.find((r) => r.url === '/users');
    if (!route) throw new Error('/users route not found');
    const ctrl = route.controller(app);
    expect(ctrl.app).toBe(app);
  });

  it('controller factory for /users/{id} creates a controller with the provided app', () => {
    const app = makeApp();
    const route = ROUTES.find((r) => r.url === '/users/{id}');
    if (!route) throw new Error('/users/{id} route not found');
    const ctrl = route.controller(app);
    expect(ctrl.app).toBe(app);
  });

  it('a manually constructed ModuleType satisfies the interface', () => {
    const app = makeApp();
    const mod: ModuleType = {
      url: '/test',
      controller: (a) => ROUTES[0]!.controller(a),
    };
    expect(typeof mod.url).toBe('string');
    expect(mod.controller(app)).toBeInstanceOf(Controller);
  });
});
