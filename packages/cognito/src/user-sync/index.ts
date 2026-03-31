import { Logger } from '@aws-lambda-powertools/logger';
import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';
import { PostgresUserRepository } from '@services/users/infrastructure/repositories/postgres-user.repository';
import { TRIGGER_HANDLERS } from '@user-sync/infrastructure/adapters/trigger-handlers';
import type { CognitoUserSyncEvent } from './types';

const logger = new Logger({ serviceName: 'cognito-user-sync' });

export async function handler(
  event: CognitoUserSyncEvent,
): Promise<CognitoUserSyncEvent> {
  const dbService = new PostgresDatabaseService();

  try {
    const attrs = event.request.userAttributes;

    logger.info('Processing user sync event', {
      triggerSource: event.triggerSource,
      userName: event.userName,
      email: attrs['email'],
    });

    const triggerHandler = TRIGGER_HANDLERS[event.triggerSource];

    if (!triggerHandler) {
      logger.info('No handler for trigger, skipping', {
        triggerSource: event.triggerSource,
      });
      return event;
    }

    const repo = new PostgresUserRepository(dbService);
    const action = await triggerHandler(attrs, repo);

    logger.info(`User sync completed: ${action}`, {
      triggerSource: event.triggerSource,
      uid: attrs['sub'],
    });
  } catch (error) {
    logger.error('User sync failed', { error });
    throw error;
  } finally {
    await dbService.end();
  }

  return event;
}
