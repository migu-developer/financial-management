import { handler } from '@services/users/index';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

const UID = process.env['USER_ID'] ?? '';

const event = {
  httpMethod: 'PATCH',
  path: `/users/${UID}`,
  resource: '/users/{id}',
  pathParameters: { id: UID },
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  headers: { 'Content-Type': 'application/json' },
  multiValueHeaders: {},
  body: JSON.stringify({
    first_name: 'Miguel Angel',
    phone: '+573001234567',
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
