import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { S3Client } from '@aws-sdk/client-s3';
import type { CustomMessageTriggerEvent } from './types';

import {
  resolveLocale,
  getMessages,
  getEmailHtmlFromS3,
  TRIGGER_TO_TEMPLATE,
} from './templates/index';

/** Minimal Lambda context shape for addContext (requestId, coldStart, etc.). */
interface LambdaContext {
  awsRequestId?: string;
  functionName?: string;
  [key: string]: unknown;
}

const logger = new Logger({ serviceName: 'cognito-custom-message' });
const tracer = new Tracer({ serviceName: 'cognito-custom-message' });
const s3Client = tracer.captureAWSv3Client(new S3Client({}));

export async function handler(
  event: CustomMessageTriggerEvent,
  context?: LambdaContext,
): Promise<CustomMessageTriggerEvent> {
  tracer.annotateColdStart();

  if (context)
    logger.addContext(
      context as unknown as Parameters<Logger['addContext']>[0],
    );

  const locale = resolveLocale(event.request.userAttributes['locale']);
  const messages = getMessages(locale);
  const content = messages[event.triggerSource];

  logger.info('Processing custom message', {
    triggerSource: event.triggerSource,
    locale,
    hasContent: !!content,
  });

  if (!content) {
    logger.warn('No message content for trigger, returning event unchanged', {
      triggerSource: event.triggerSource,
    });
    return event;
  }

  const templateName = TRIGGER_TO_TEMPLATE[event.triggerSource];
  logger.debug('Fetching email template from S3', { locale, templateName });

  const htmlFromS3 = await getEmailHtmlFromS3(s3Client, locale, templateName);

  if (!htmlFromS3) {
    logger.error('Email template not found in S3', { locale, templateName });
    throw new Error(
      `Custom message: email template not found in S3 for locale=${locale}, template=${templateName}. Ensure templates are uploaded (e.g. pnpm email:export:cognito && pnpm email:upload).`,
    );
  }

  event.response = {
    ...(event.response || {}),
    emailSubject: content.emailSubject,
    emailMessage: htmlFromS3,
    smsMessage: content.smsMessage,
  };

  logger.info('Custom message response set', {
    triggerSource: event.triggerSource,
    locale,
    templateName,
  });

  return event;
}
