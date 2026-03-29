import { Controller } from './controller';
import { Service } from './service';
import { Application } from '@services/currencies/presentation/application';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import type { LoggerService } from '@services/shared/domain/services/logger';
import type { DatabaseService } from '@services/shared/domain/services/database';
import type { User } from '@packages/models/users/interface';

function makeMockLogger(): LoggerService {
  return { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
}

function makeMockDbService(): DatabaseService {
  return { query: jest.fn(), queryReadOnly: jest.fn(), end: jest.fn() };
}

function makeApp(): Application {
  const event: APIGatewayProxyEvent = {
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
  };
  const user: User = { sub: 'u1', email: 'u@test.com' };
  return new Application({
    event,
    logger: makeMockLogger(),
    user,
    dbService: makeMockDbService(),
  });
}

describe('Controller (mixin composition)', () => {
  it('stores app and service in constructor', () => {
    const app = makeApp();
    const service = new Service(app);
    const ctrl = new Controller(app, service);
    expect(ctrl.app).toBe(app);
    expect(ctrl.service).toBe(service);
  });

  it('GET delegates to service.executeGET', async () => {
    const app = makeApp();
    const service = new Service(app);
    const mockResponse = new Response('ok');
    jest.spyOn(service, 'executeGET').mockResolvedValue(mockResponse);
    const result = await new Controller(app, service).GET();
    expect(service.executeGET).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockResponse);
  });

  it('POST delegates to service.executePOST', async () => {
    const app = makeApp();
    const service = new Service(app);
    jest.spyOn(service, 'executePOST').mockResolvedValue(new Response('ok'));
    await new Controller(app, service).POST();
    expect(service.executePOST).toHaveBeenCalledTimes(1);
  });

  it('PUT delegates to service.executePUT', async () => {
    const app = makeApp();
    const service = new Service(app);
    jest.spyOn(service, 'executePUT').mockResolvedValue(new Response('ok'));
    await new Controller(app, service).PUT();
    expect(service.executePUT).toHaveBeenCalledTimes(1);
  });

  it('PATCH delegates to service.executePATCH', async () => {
    const app = makeApp();
    const service = new Service(app);
    jest.spyOn(service, 'executePATCH').mockResolvedValue(new Response('ok'));
    await new Controller(app, service).PATCH();
    expect(service.executePATCH).toHaveBeenCalledTimes(1);
  });

  it('DELETE delegates to service.executeDELETE', async () => {
    const app = makeApp();
    const service = new Service(app);
    jest.spyOn(service, 'executeDELETE').mockResolvedValue(new Response('ok'));
    await new Controller(app, service).DELETE();
    expect(service.executeDELETE).toHaveBeenCalledTimes(1);
  });

  it('propagates errors thrown by service', async () => {
    const app = makeApp();
    const service = new Service(app);
    jest.spyOn(service, 'executeGET').mockRejectedValue(new Error('db error'));
    await expect(new Controller(app, service).GET()).rejects.toThrow(
      'db error',
    );
  });
});
