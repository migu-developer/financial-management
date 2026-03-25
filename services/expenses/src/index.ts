import { Logger } from '@aws-lambda-powertools/logger';
import { APIGatewayProxyEvent } from './types';

const logger = new Logger({
  serviceName: 'expenses-service',
});

export const handler = async (event: APIGatewayProxyEvent) => {
  logger.info('Processing expenses event', {
    httpMethod: event.httpMethod,
    path: event.path,
    resource: event.resource,
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Expenses service is running',
      method: event.httpMethod,
      path: event.path,
    }),
  };
};
