import { handler } from '@services/chat/handlers/chat';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

const event = {
  httpMethod: 'POST',
  path: '/chat/confirm',
  resource: '/chat/confirm',
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  headers: { 'content-type': 'application/json' },
  multiValueHeaders: {},
  body: JSON.stringify({
    taskToken: process.env['CHAT_TASK_TOKEN'] ?? 'dummy-task-token',
    confirmed: process.env['CHAT_CONFIRMED'] !== 'false',
  }),
  isBase64Encoded: false,
  stageVariables: null,
  requestContext: {
    authorizer: {
      sub: process.env['USER_ID'] ?? '',
      email: process.env['USER_EMAIL'] ?? 'test@example.com',
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
