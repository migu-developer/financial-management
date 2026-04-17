import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '@components/EmailLayout';
import { ServiceAlertBlock } from '@components/ServiceAlertBlock';
import {
  ALERT_ALARM_NAME,
  ALERT_SEVERITY,
  ALERT_SERVICE,
  ALERT_DESCRIPTION,
  ALERT_TIMESTAMP,
  ALERT_DASHBOARD_URL,
  ALERT_STAGE,
} from '@utils/alert-constants';
import { footerCopy } from './footer-copy';

export interface ServiceAlertEmailProps {
  alarmName?: string;
  severity?: 'CRITICAL' | 'WARNING';
  service?: string;
  description?: string;
  timestamp?: string;
  dashboardUrl?: string;
  stage?: string;
}

export default function ServiceAlertEmail({
  alarmName = ALERT_ALARM_NAME,
  severity = ALERT_SEVERITY as 'CRITICAL' | 'WARNING',
  service = ALERT_SERVICE,
  description = ALERT_DESCRIPTION,
  timestamp = ALERT_TIMESTAMP,
  dashboardUrl = ALERT_DASHBOARD_URL,
  stage = ALERT_STAGE,
}: ServiceAlertEmailProps) {
  return (
    <EmailLayout
      preview={`[${stage}] Service Alert — ${severity}: ${alarmName}`}
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          Service Alert
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-2 mb-6 m-0">
          An alarm has been triggered in your Financial Management
          infrastructure. Please review the details below and take action if
          necessary.
        </Text>

        <ServiceAlertBlock
          alarmName={alarmName}
          severity={severity}
          service={service}
          description={description}
          timestamp={timestamp}
          dashboardUrl={dashboardUrl}
        />

        <Hr className="border-neutral-200 my-6" />

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          This is an automated notification from CloudWatch. If you believe this
          is a false positive, check the dashboard for more context. Alarms use
          &quot;2 of 3 evaluation periods&quot; to reduce noise.
        </Text>
      </Section>
    </EmailLayout>
  );
}

ServiceAlertEmail.PreviewProps = {
  alarmName: 'API-5xx-Errors',
  severity: 'CRITICAL',
  service: 'API Gateway',
  description:
    'Threshold Crossed: 8 datapoints were greater than the threshold (5.0)',
  timestamp: '2026-04-08T10:00:00.000Z',
  dashboardUrl: 'https://console.aws.amazon.com/cloudwatch/home#dashboards',
} satisfies ServiceAlertEmailProps;
