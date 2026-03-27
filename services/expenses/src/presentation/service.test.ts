import { ExpensesService, ExpenseService } from './service';
import { HttpCode } from '@packages/models/shared/utils/http-code';
import { Application } from './application';
import type { APIGatewayProxyEvent } from 'src/types';
import type { LoggerService } from '@services/expenses/domain/services/logger';
import type { User } from '@packages/models/users/interface';

jest.useFakeTimers();

function makeMockLogger(): LoggerService {
  return { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
}

function makeApp(): Application {
  const event: APIGatewayProxyEvent = {
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
  };
  const user: User = { sub: 'u1', email: 'u@test.com' };
  return new Application({ event, logger: makeMockLogger(), user });
}

describe('ExpensesService', () => {
  it('executeGET returns 200 with success:true', async () => {
    const service = new ExpensesService(makeApp());
    const p = service.executeGET();
    jest.runAllTimers();
    const response = await p;
    expect(response.status).toBe(HttpCode.SUCCESS);
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('executePOST returns 200 with success:true', async () => {
    const service = new ExpensesService(makeApp());
    const p = service.executePOST();
    jest.runAllTimers();
    const response = await p;
    expect(response.status).toBe(HttpCode.SUCCESS);
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('executeGET logs the operation', async () => {
    const logger = makeMockLogger();
    const event: APIGatewayProxyEvent = {
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
    };
    const app = new Application({
      event,
      logger,
      user: { sub: 'u1', email: 'u@test.com' },
    });
    const service = new ExpensesService(app);
    const p = service.executeGET();
    jest.runAllTimers();
    await p;
    expect(logger.info).toHaveBeenCalled();
  });
});

describe('ExpenseService', () => {
  it('executeGET returns 200', async () => {
    const service = new ExpenseService(makeApp());
    const p = service.executeGET();
    jest.runAllTimers();
    expect((await p).status).toBe(HttpCode.SUCCESS);
  });

  it('executePOST returns 200', async () => {
    const service = new ExpenseService(makeApp());
    const p = service.executePOST();
    jest.runAllTimers();
    expect((await p).status).toBe(HttpCode.SUCCESS);
  });

  it('executePUT returns 200', async () => {
    const service = new ExpenseService(makeApp());
    const p = service.executePUT();
    jest.runAllTimers();
    expect((await p).status).toBe(HttpCode.SUCCESS);
  });

  it('executePATCH returns 200', async () => {
    const service = new ExpenseService(makeApp());
    const p = service.executePATCH();
    jest.runAllTimers();
    expect((await p).status).toBe(HttpCode.SUCCESS);
  });

  it('executeDELETE returns 200', async () => {
    const service = new ExpenseService(makeApp());
    const p = service.executeDELETE();
    jest.runAllTimers();
    expect((await p).status).toBe(HttpCode.SUCCESS);
  });
});
