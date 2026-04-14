import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoAdminAdapter } from '@user-sync/infrastructure/adapters/cognito-admin.adapter';
import { TRIGGER_HANDLERS } from '@pre-signup/infrastructure/adapters/trigger-handlers';
import type { PreSignUpEvent } from './types';

const logger = new Logger({ serviceName: 'cognito-pre-signup' });
const tracer = new Tracer({ serviceName: 'cognito-pre-signup' });
const client = tracer.captureAWSv3Client(new CognitoIdentityProviderClient({}));

export async function handler(event: PreSignUpEvent): Promise<PreSignUpEvent> {
  tracer.annotateColdStart();
  tracer.putAnnotation('triggerSource', event.triggerSource);

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
