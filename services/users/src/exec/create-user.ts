import { handler } from '@services/users/handlers/get-users';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';
import { randomUUID } from 'node:crypto';

const uuid = randomUUID();

const event = {
  httpMethod: 'POST',
  path: '/users',
  resource: '/users',
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  headers: { 'Content-Type': 'application/json' },
  multiValueHeaders: {},
  body: JSON.stringify({
    uid: uuid,
    email: `test-${uuid.slice(0, 8)}@test.com`,
    first_name: 'Test',
    last_name: 'User',
    locale: 'en',
  }),
  isBase64Encoded: false,
  stageVariables: null,
  requestContext: {
    authorizer: {
      sub: process.env['USER_ID'] ?? '',
      email: 'test@example.com',
    },
  },
} as unknown as APIGatewayProxyEvent;

handler(event)
  .then((response) => {
    const logger = new LoggerServiceImplementation();
    logger.info(JSON.stringify(response, null, 2));
  })
  .catch((error: unknown) => {
    const logger = new LoggerServiceImplementation();
    logger.error(JSON.stringify(error, null, 2));
  });
