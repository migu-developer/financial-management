import type { SESClient } from '@aws-sdk/client-ses';
import { SendEmailCommand } from '@aws-sdk/client-ses';
import type { S3Client } from '@aws-sdk/client-s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import type { AlertPayload } from '@notifications/domain/types';

const TEMPLATE_NAME = 'service-alert';
const DEFAULT_LOCALE = 'en';

async function getTemplateFromS3(
  s3: S3Client,
  locale: string,
): Promise<string | null> {
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
  const stage = process.env['STAGE']?.toUpperCase() ?? '';
  return html
    .replaceAll('{{alarmName}}', payload.alarmName)
    .replaceAll('{{severity}}', payload.severity)
    .replaceAll('{{service}}', payload.service)
    .replaceAll('{{description}}', payload.description)
    .replaceAll('{{timestamp}}', payload.timestamp)
    .replaceAll('{{dashboardUrl}}', payload.dashboardUrl)
    .replaceAll('{{stage}}', stage);
}

export async function sendAlertEmail(
  payload: AlertPayload,
  fromEmail: string,
  toEmail: string,
  clients: { ses: SESClient; s3: S3Client },
): Promise<void> {
  const html = await getTemplateFromS3(clients.s3, DEFAULT_LOCALE);
  if (!html) {
    throw new Error(
      `Alert email template not found in S3. Ensure templates are uploaded (pnpm email:export && pnpm email:upload).`,
    );
  }

  const body = replacePlaceholders(html, payload);
  const stage = process.env['STAGE']?.toUpperCase() ?? '';
  const stageTag = stage ? `[${stage}] ` : '';
  const subject = `${stageTag}[${payload.severity}] ${payload.alarmName} — ${payload.service}`;

  const configSetName = process.env['SES_CONFIGURATION_SET_NAME'];

  await clients.ses.send(
    new SendEmailCommand({
      Source: fromEmail,
      Destination: { ToAddresses: [toEmail] },
      ...(configSetName && { ConfigurationSetName: configSetName }),
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
