import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { CustomMessageTriggerSource } from '@custom-message/types';

/**
 * Map Cognito Custom Message trigger source to the transactional email template name
 * (file name in S3 without extension). Must match the keys used by the upload script
 * and the React Email components in @packages/transactional.
 */
export const TRIGGER_TO_TEMPLATE: Record<CustomMessageTriggerSource, string> = {
  CustomMessage_SignUp: 'account-verification',
  CustomMessage_AdminCreateUser: 'admin-invitation',
  CustomMessage_ResendCode: 'resend-verification-code',
  CustomMessage_ForgotPassword: 'password-reset',
  CustomMessage_UpdateUserAttribute: 'account-update-verification',
  CustomMessage_VerifyUserAttribute: 'attribute-verification',
  CustomMessage_Authentication: 'mfa-authentication',
};

export function getS3Key(
  locale: string,
  templateName: string,
  prefix: string,
): string {
  return `${prefix.replace(/\/$/, '')}/${locale}/${templateName}.html`;
}

/**
 * Fetches the email HTML for the given locale and template from S3.
 * Uses ASSETS_BUCKET_NAME and EMAILS_PREFIX from env.
 */
export async function getEmailHtmlFromS3(
  locale: string,
  templateName: string,
): Promise<string | null> {
  const bucketName = process.env.ASSETS_BUCKET_NAME;
  const prefix = process.env.EMAILS_PREFIX;
  if (!bucketName || !prefix) return null;
  const client = new S3Client({});
  const key = getS3Key(locale, templateName, prefix);
  try {
    const response = await client.send(
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
    );
    const body = response.Body;
    if (!body) return null;
    return await body.transformToString('utf-8');
  } catch {
    return null;
  }
}
