import { handler } from '@services/chat/handlers/chat';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

const event = {
  httpMethod: 'POST',
  path: '/chat',
  resource: '/chat',
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  headers: { 'content-type': 'application/json' },
  multiValueHeaders: {},
  body: JSON.stringify({
    content: process.env['CHAT_MESSAGE'],
    ...(process.env['CHAT_SESSION_ID'] && {
      sessionId: process.env['CHAT_SESSION_ID'],
    }),
  }),
  isBase64Encoded: false,
  stageVariables: null,
  requestContext: {
    authorizer: {
      sub: process.env['USER_ID'] ?? '',
      email: process.env['USER_EMAIL'],
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
