import { handler } from '@services/expenses/index';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

const EXPENSE_ID = process.env['EXPENSE_ID'] ?? '';

const event = {
  httpMethod: 'PUT',
  path: `/expenses/${EXPENSE_ID}`,
  resource: '/expenses/{id}',
  pathParameters: { id: EXPENSE_ID },
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  headers: { 'Content-Type': 'application/json' },
  multiValueHeaders: {},
  body: JSON.stringify({
    name: 'Updated grocery shopping',
    value: 75000,
    currency_id: process.env['CURRENCY_ID'] ?? '',
    expense_type_id: process.env['EXPENSE_TYPE_ID'] ?? '',
    expense_category_id: process.env['EXPENSE_CATEGORY_ID'] ?? '',
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
