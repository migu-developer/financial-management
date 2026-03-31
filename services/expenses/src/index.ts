import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import type { APIGatewayProxyResult } from '@services/shared/domain/interfaces/response';
import type { UserProfile } from '@packages/models/users/types';
import { Application } from '@services/expenses/presentation/application';
import { Router } from '@services/expenses/router';
import { ResultBodyUndefinedError } from '@packages/models/shared/utils/errors';
import { ErrorHandler } from '@services/shared/domain/utils/error-handler';
import { addCors } from '@services/shared/domain/utils/cors';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';
import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';
import { HttpCode } from '@packages/models/shared/utils/http-code';
import { getUserProfile } from '@packages/models/users/utils';

const dbService = new PostgresDatabaseService();

export const handler = async (event: APIGatewayProxyEvent) => {
  let response: APIGatewayProxyResult | undefined = undefined;

  const logger = new LoggerServiceImplementation();

  try {
    const user: UserProfile = getUserProfile(
      event.requestContext.authorizer as {
        [key: string]: unknown;
      },
    );

    logger.info('Processing expenses event', {
      httpMethod: event.httpMethod,
      path: event.path,
      resource: event.resource,
      authorizer: event.requestContext.authorizer,
      user: user,
    });

    const app = new Application({
      event: event,
      logger,
      user,
      dbService,
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
