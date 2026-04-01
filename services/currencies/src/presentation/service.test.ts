import { CurrenciesService } from './service';
import { HttpCode } from '@packages/models/shared/utils/http-code';
import { Application } from './application';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import type { LoggerService } from '@services/shared/domain/services/logger';
import type { DatabaseService } from '@services/shared/domain/services/database';
import type { UserProfile } from '@packages/models/users/types';

function makeMockLogger(): LoggerService {
  return { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
}

function makeApp(dbService: DatabaseService): Application {
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

describe('CurrenciesService', () => {
  it('executeGET returns 200 with currencies from db', async () => {
    const mockCurrencies = [
      {
        id: 'uuid-1',
        code: 'COP',
        name: 'Peso Colombiano',
        symbol: '$',
        country: 'Colombia',
      },
      {
        id: 'uuid-2',
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        country: 'Finland',
      },
    ];
    const dbService: DatabaseService = {
      query: jest.fn(),
      queryReadOnly: jest.fn().mockResolvedValue(mockCurrencies),
      end: jest.fn(),
    };

    const service = new CurrenciesService(makeApp(dbService));
    const response = await service.executeGET();

    expect(response.status).toBe(HttpCode.SUCCESS);
    const body = (await response.json()) as { success: boolean; data: unknown };
    expect(body.success).toBe(true);
    expect(body.data).toEqual(mockCurrencies);
  });

  it('executeGET propagates db errors', async () => {
    const dbError = new Error('DB connection failed');
    const dbService: DatabaseService = {
      query: jest.fn(),
      queryReadOnly: jest.fn().mockRejectedValue(dbError),
      end: jest.fn(),
    };

    const service = new CurrenciesService(makeApp(dbService));
    await expect(service.executeGET()).rejects.toThrow('DB connection failed');
  });
});
