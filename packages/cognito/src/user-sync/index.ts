import { Logger } from '@aws-lambda-powertools/logger';
import { PostgresDatabaseService } from '@services/shared/infrastructure/services/DatabaseServiceImp';
import { PostgresUserRepository } from '@services/users/infrastructure/repositories/postgres-user.repository';
import { CreateUserUseCase } from '@services/users/application/use-cases/create-user.use-case';
import { PatchUserUseCase } from '@services/users/application/use-cases/patch-user.use-case';
import type { CognitoUserSyncEvent } from './types';
import { mapToCreateInput, mapToPatchInput } from './mapper';

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

    const repo = new PostgresUserRepository(dbService);

    if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
      const useCase = new CreateUserUseCase(repo);
      const input = mapToCreateInput(attrs);
      await useCase.execute(input, attrs['email']!);
      logger.info('User created in database', { uid: attrs['sub'] });
    }

    if (event.triggerSource === 'PostAuthentication_Authentication') {
      const useCase = new PatchUserUseCase(repo);
      const input = mapToPatchInput(attrs);
      await useCase.execute(attrs['sub']!, input, attrs['email']!);
      logger.info('User updated in database', { uid: attrs['sub'] });
    }
  } catch (error) {
    logger.error('User sync failed', { error });
    throw error;
  } finally {
    await dbService.end();
  }

  return event;
}
