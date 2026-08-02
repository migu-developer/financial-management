import { handler } from '@services/chat/handlers/chat';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

/**
 * Local runner for `POST /chat/upload-url`.
 *
 * Prints a presigned PUT you can exercise straight away — note that the
 * `Content-Type` header MUST match the one requested here, because it is part
 * of the signature:
 *
 *   curl -X PUT "<uploadUrl>" -H 'Content-Type: image/jpeg' \
 *        --data-binary @receipt.jpg
 */
const event = {
  httpMethod: 'POST',
  path: '/chat/upload-url',
  resource: '/chat/upload-url',
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  headers: { 'content-type': 'application/json' },
  multiValueHeaders: {},
  body: JSON.stringify({
    contentType: process.env['ATTACHMENT_CONTENT_TYPE'] ?? 'image/jpeg',
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
