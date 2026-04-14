import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import type { AlertPayload } from '../domain/types';

const ses = new SESClient({});
const s3 = new S3Client({});

const TEMPLATE_NAME = 'service-alert';
const DEFAULT_LOCALE = 'en';

async function getTemplateFromS3(locale: string): Promise<string | null> {
  const bucketName = process.env['ASSETS_BUCKET_NAME'];
  const prefix = process.env['EMAILS_PREFIX'];
  if (!bucketName || !prefix) return null;

  const key = `${prefix.replace(/\/$/, '')}/${locale}/${TEMPLATE_NAME}.html`;
  try {
    const response = await s3.send(
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
    );
    if (!response.Body) return null;
    return await response.Body.transformToString('utf-8');
  } catch {
    return null;
  }
}

function replacePlaceholders(html: string, payload: AlertPayload): string {
  return html
    .replaceAll('{{alarmName}}', payload.alarmName)
    .replaceAll('{{severity}}', payload.severity)
    .replaceAll('{{service}}', payload.service)
    .replaceAll('{{description}}', payload.description)
    .replaceAll('{{timestamp}}', payload.timestamp)
    .replaceAll('{{dashboardUrl}}', payload.dashboardUrl);
}

export async function sendAlertEmail(
  payload: AlertPayload,
  fromEmail: string,
  toEmail: string,
): Promise<void> {
  const html = await getTemplateFromS3(DEFAULT_LOCALE);
  if (!html) {
    throw new Error(
      `Alert email template not found in S3. Ensure templates are uploaded (pnpm email:export && pnpm email:upload).`,
    );
  }

  const body = replacePlaceholders(html, payload);
  const subject = `[${payload.severity}] ${payload.alarmName} — ${payload.service}`;

  await ses.send(
    new SendEmailCommand({
      Source: fromEmail,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: body, Charset: 'UTF-8' },
          Text: {
            Data: `${payload.severity}: ${payload.alarmName}\nService: ${payload.service}\nTime: ${payload.timestamp}\nDetails: ${payload.description}`,
            Charset: 'UTF-8',
          },
        },
      },
    }),
  );
}
