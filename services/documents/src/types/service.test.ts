import { Service } from './service';
import { Application } from '@services/documents/presentation/application';
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
    path: '/documents',
    resource: '/documents',
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
      path: '/documents',
      stage: 'test',
      requestId: 'req-1',
      requestTimeEpoch: 0,
      resourceId: 'res-1',
      resourcePath: '/documents',
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

  it('executeGET returns a Response with "Not implemented" body', async () => {
    const response = await new Service(makeApp()).executeGET();
    expect(response).toBeInstanceOf(Response);
    expect(await response.text()).toBe('Not implemented');
  });

  it('executePOST returns a Response', async () => {
    expect(await new Service(makeApp()).executePOST()).toBeInstanceOf(Response);
  });

  it('executePUT returns a Response', async () => {
    expect(await new Service(makeApp()).executePUT()).toBeInstanceOf(Response);
  });

  it('executePATCH returns a Response', async () => {
    expect(await new Service(makeApp()).executePATCH()).toBeInstanceOf(
      Response,
    );
  });

  it('executeDELETE returns a Response', async () => {
    expect(await new Service(makeApp()).executeDELETE()).toBeInstanceOf(
      Response,
    );
  });

  it('all default methods return "Not implemented" body', async () => {
    const service = new Service(makeApp());
    const methods = [
      service.executeGET(),
      service.executePOST(),
      service.executePUT(),
      service.executePATCH(),
      service.executeDELETE(),
    ];
    const responses = await Promise.all(methods);
    const bodies = await Promise.all(responses.map((r) => r.text()));
    expect(bodies.every((b) => b === 'Not implemented')).toBe(true);
  });
});
