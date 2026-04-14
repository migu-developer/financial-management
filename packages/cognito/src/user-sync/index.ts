import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';
import { PostgresUserRepository } from '@services/users/infrastructure/repositories/postgres-user.repository';
import { CognitoAdminAdapter } from '@user-sync/infrastructure/adapters/cognito-admin.adapter';
import { TRIGGER_HANDLERS } from '@user-sync/infrastructure/adapters/trigger-handlers';
import type { CognitoUserSyncEvent } from './types';

const logger = new Logger({ serviceName: 'cognito-user-sync' });
const tracer = new Tracer({ serviceName: 'cognito-user-sync' });
const cognitoClient = tracer.captureAWSv3Client(
  new CognitoIdentityProviderClient({}),
);

export async function handler(
  event: CognitoUserSyncEvent,
): Promise<CognitoUserSyncEvent> {
  tracer.annotateColdStart();
  tracer.putAnnotation('triggerSource', event.triggerSource);

  const dbService = new PostgresDatabaseService();

  try {
    logger.info('Processing user sync event', {
      triggerSource: event.triggerSource,
      userName: event.userName,
      email: event.request.userAttributes['email'],
    });

    const triggerHandler = TRIGGER_HANDLERS[event.triggerSource];

    if (!triggerHandler) {
      logger.info('No handler for trigger, skipping', {
        triggerSource: event.triggerSource,
      });
      return event;
    }

    const dbPort = new PostgresUserRepository(dbService);
    const cognitoAdmin = new CognitoAdminAdapter(cognitoClient);
    const action = await triggerHandler(event, { dbPort, cognitoAdmin });

    logger.info(`User sync completed: ${action}`, {
      triggerSource: event.triggerSource,
      uid: event.request.userAttributes['sub'],
    });
  } catch (error) {
    logger.error('User sync failed', { error });
    throw error;
  } finally {
    await dbService.end();
  }

  return event;
}
