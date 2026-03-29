import { handler } from '@services/expenses/index';
import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';

const EXPENSE_ID = '0a4a0c1c-ef92-472d-8204-8b64742eeffc';

const event = {
  httpMethod: 'PATCH',
  path: `/expenses/${EXPENSE_ID}`,
  resource: '/expenses/{id}',
  pathParameters: { id: EXPENSE_ID },
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  headers: { 'Content-Type': 'application/json' },
  multiValueHeaders: {},
  body: JSON.stringify({
    name: 'Patched expense name',
    value: 30000,
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
