import { handler } from '@services/expenses/index';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

const event = {
  httpMethod: 'POST',
  path: '/expenses',
  resource: '/expenses',
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  headers: { 'Content-Type': 'application/json' },
  multiValueHeaders: {},
  body: JSON.stringify({
    name: 'Grocery shopping',
    value: 50000,
    currency_id: '891a0eb2-232a-4de6-a84b-1dca56e505ff',
    expense_type_id: '261c13e5-25bc-44b4-827b-f9115bc96fe6',
    expense_category_id: '21a82dcb-1aab-4534-ae93-ad6a38a76b7b',
  }),
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
