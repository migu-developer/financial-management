import { handler } from '@services/expenses/handlers/get-expenses';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

const event = {
  httpMethod: 'GET',
  path: '/expenses',
  resource: '/expenses',
  pathParameters: null,
  queryStringParameters: {
    limit: '20',
    ...(process.env['EXPENSE_TYPE_ID'] && {
      expense_type_id: process.env['EXPENSE_TYPE_ID'],
    }),
    ...(process.env['EXPENSE_CATEGORY_ID'] && {
      expense_category_id: process.env['EXPENSE_CATEGORY_ID'],
    }),
    ...(process.env['EXPENSE_NAME'] && {
      name: process.env['EXPENSE_NAME'],
    }),
  },
  multiValueQueryStringParameters: null,
  headers: {},
  multiValueHeaders: {},
  body: null,
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
