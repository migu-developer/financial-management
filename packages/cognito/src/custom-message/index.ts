import type { CustomMessageTriggerEvent } from './types';
import {
  resolveLocale,
  getMessages,
  getEmailHtmlFromS3,
  TRIGGER_TO_TEMPLATE,
} from './templates/index';

export async function handler(
  event: CustomMessageTriggerEvent,
): Promise<CustomMessageTriggerEvent> {
  const locale = resolveLocale(event.request.userAttributes['locale']);
  const messages = getMessages(locale);
  const content = messages[event.triggerSource];

  if (!content) return event;

  const templateName = TRIGGER_TO_TEMPLATE[event.triggerSource];
  const htmlFromS3 = await getEmailHtmlFromS3(locale, templateName);

  if (!htmlFromS3) {
    throw new Error(
      `Custom message: email template not found in S3 for locale=${locale}, template=${templateName}. Ensure templates are uploaded (e.g. pnpm email:export:cognito && pnpm email:upload).`,
    );
  }

  event.response.emailSubject = content.emailSubject;
  event.response.emailMessage = htmlFromS3;
  event.response.smsMessage = content.smsMessage;

  return event;
}
