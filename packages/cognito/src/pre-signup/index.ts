import { Logger } from '@aws-lambda-powertools/logger';
import { TracerServiceImplementation } from '@services/shared/infrastructure/services/TracerServiceImp';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoAdminAdapter } from '@user-sync/infrastructure/adapters/cognito-admin.adapter';
import { TRIGGER_HANDLERS } from '@pre-signup/infrastructure/adapters/trigger-handlers';
import type { PreSignUpEvent } from './types';

const logger = new Logger({ serviceName: 'cognito-pre-signup' });
const tracerService = new TracerServiceImplementation('cognito-pre-signup');
const client = tracerService.captureAWSv3Client(
  new CognitoIdentityProviderClient({}),
);

export async function handler(event: PreSignUpEvent): Promise<PreSignUpEvent> {
  tracerService.annotateColdStart();
  tracerService.putAnnotation('triggerSource', event.triggerSource);

  logger.info('Processing pre-signup event', {
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

  const adapter = new CognitoAdminAdapter(client);
  const action = await triggerHandler(event, adapter);

  logger.info(`Pre-signup completed: ${action}`, {
    triggerSource: event.triggerSource,
    userName: event.userName,
  });

  return event;
}
