import { handler } from '@services/expenses/index';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

const event = {
  httpMethod: 'GET',
  path: '/expenses',
  resource: '/expenses',
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  headers: {},
  multiValueHeaders: {},
  body: null,
  isBase64Encoded: false,
  stageVariables: null,
  requestContext: {
    authorizer: {
      sub: 'b448a428-60d1-70dd-eaca-3283019d5ee0',
      email: 'gutierrezmayamiguelangel@gmail.com',
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
