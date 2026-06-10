import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import type { APIGatewayProxyResult } from '@services/shared/domain/interfaces/response';
import type { UserProfile } from '@packages/models/users/types';
import { Application } from '@services/chat/presentation/application';
import { Router } from '@services/chat/router';
import { ResultBodyUndefinedError } from '@packages/models/shared/utils/errors';
import { ErrorHandler } from '@services/shared/domain/utils/error-handler';
import { addCors } from '@services/shared/domain/utils/cors';
import { LoggerServiceImplementation } from '@services/shared/infrastructure/services/LoggerServiceImp';
import { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';
import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';
import { HttpCode } from '@packages/models/shared/utils/http-code';
import { getUserProfile } from '@packages/models/users/utils';
import { SfnWorkflowStarter } from '@services/chat/infrastructure/services/sfn-workflow-starter.service';
import { SfnWorkflowCallback } from '@services/chat/infrastructure/services/sfn-workflow-callback.service';

const dbService = new PostgresDatabaseService();
const tracerService = new TracerServiceImplementation('chat-service');
const workflowStarter = new SfnWorkflowStarter(
  process.env['CHAT_STATE_MACHINE_ARN'] ?? '',
);
const workflowCallback = new SfnWorkflowCallback();

export const handler = async (event: APIGatewayProxyEvent) => {
  let response: APIGatewayProxyResult | undefined = undefined;

  const logger = new LoggerServiceImplementation();
  tracerService.annotateColdStart();
  tracerService.putAnnotation('httpMethod', event.httpMethod);
  tracerService.putAnnotation('resource', event.resource);

  try {
    const user: UserProfile = getUserProfile(
      event.requestContext.authorizer as {
        [key: string]: unknown;
      },
    );
    tracerService.putAnnotation('userId', user.uid);

    logger.info('Processing chat event', {
      httpMethod: event.httpMethod,
      path: event.path,
      resource: event.resource,
      user: user,
    });

    const app = new Application({
      event,
      logger,
      user,
      dbService,
      workflowStarter,
      workflowCallback,
    });

    const router = Router.instantiate(app);
    const result: Response = await router.dispatch();
    const body = (await result.json()) as unknown;

    logger.info(
      `Result: ${JSON.stringify(result)}, body: ${JSON.stringify(body)}`,
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
      response.headers = addCors(response, event.headers);
      logger.info(`Response: ${JSON.stringify(response)}`, handler.name);
    }
  }

  response ??= {
    statusCode: HttpCode.INTERNAL_SERVER_ERROR,
    body: JSON.stringify({ message: 'Internal server error' }),
  };

  return response;
};
