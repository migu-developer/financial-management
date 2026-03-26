import { Logger } from '@aws-lambda-powertools/logger';
import type { APIGatewayProxyEvent } from './types';

const logger = new Logger({
  serviceName: 'expenses-service',
});

interface CognitoClaims {
  sub: string;
  email: string;
  [key: string]: unknown;
}

export const handler = (event: APIGatewayProxyEvent) => {
  const claims =
    (event.requestContext.authorizer as CognitoClaims | null) ?? {};

  logger.info('Processing expenses event', {
    httpMethod: event.httpMethod,
    path: event.path,
    resource: event.resource,
    claims: claims,
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
      pathParameters: event.pathParameters,
      user: {
        ...claims,
      },
    }),
  };
};
