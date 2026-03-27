import type { APIGatewayProxyEvent, APIGatewayProxyResult } from './types';
import type { User } from '@packages/models/users/interface';
import { Application } from '@services/expenses/presentation/application';
import { Router } from '@services/expenses/router';
import { ResultBodyUndefinedError } from '@packages/models/shared/utils/errors';
import { ErrorHandler } from './domain/utils/error-handler';
import { addCors } from './domain/utils/cors';

import { LoggerServiceImplementation } from '@services/expenses/infrastructure/services/LoggerServiceImp';
import { HttpCode } from '@packages/models/shared/utils/http-code';

export const handler = async (event: APIGatewayProxyEvent) => {
  let response: APIGatewayProxyResult | undefined = undefined;

  const logger = new LoggerServiceImplementation();

  try {
    const claims = event.requestContext.authorizer as User;

    logger.info('Processing expenses event', {
      httpMethod: event.httpMethod,
      path: event.path,
      resource: event.resource,
      claims: claims,
    });

    const app = new Application({
      event: event,
      logger,
      user: claims,
    });

    const router = Router.instantiate(app);

    const result: Response = await router.dispatch();
    const body = (await result.json()) as unknown;

    logger.info(
      `Result: ${JSON.stringify(result)}, body: ${body}`,
      handler.name,
    );

    if (!body) {
      throw new ResultBodyUndefinedError();
    }

    response = {
      statusCode: result.status,
      body: JSON.stringify(body),
    };
  } catch (error: unknown) {
    response = ErrorHandler.handle(error, logger);
  } finally {
    if (response !== undefined) {
      response.headers = addCors(response);
      logger.info(`Response: ${JSON.stringify(response)}`, handler.name);
    }
  }

  response ??= {
    statusCode: HttpCode.INTERNAL_SERVER_ERROR,
    body: JSON.stringify({ message: 'Internal server error' }),
  };

  return response;
};
