import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { SESClient } from '@aws-sdk/client-ses';
import { S3Client } from '@aws-sdk/client-s3';
import type { SNSEvent } from './domain/types';
import { parseAlarmMessage } from './domain/alarm-parser';
import { sendAlertEmail } from './infrastructure/ses-sender';

const logger = new Logger({ serviceName: 'alarm-notifications' });
const tracer = new Tracer({ serviceName: 'alarm-notifications' });

const ses = tracer.captureAWSv3Client(new SESClient({}));
const s3 = tracer.captureAWSv3Client(new S3Client({}));

const FROM_EMAIL = process.env['ALERT_EMAIL_FROM'] ?? '';
const TO_EMAIL = process.env['ALERT_EMAIL_TO'] ?? '';
const DASHBOARD_URL = process.env['DASHBOARD_URL'] ?? '';

export async function handler(event: SNSEvent): Promise<void> {
  tracer.annotateColdStart();

  for (const record of event.Records) {
    try {
      const payload = parseAlarmMessage(record.Sns.Message, DASHBOARD_URL);
      tracer.putAnnotation('alarmName', payload.alarmName);
      tracer.putAnnotation('severity', payload.severity);

      logger.info('Processing alarm notification', {
        alarmName: payload.alarmName,
        severity: payload.severity,
        service: payload.service,
      });

      await sendAlertEmail(payload, FROM_EMAIL, TO_EMAIL, { ses, s3 });

      logger.info('Alert email sent', {
        alarmName: payload.alarmName,
        to: TO_EMAIL,
      });
    } catch (err) {
      logger.error('Failed to process alarm notification', {
        error: err instanceof Error ? err.message : String(err),
        snsMessage: record.Sns.Message.substring(0, 200),
      });
    }
  }
}
