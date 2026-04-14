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
} from '@utils/alert-constants';
import { footerCopy } from './footer-copy';

export interface ServiceAlertEmailProps {
  alarmName?: string;
  severity?: 'CRITICAL' | 'WARNING';
  service?: string;
  description?: string;
  timestamp?: string;
  dashboardUrl?: string;
}

export default function ServiceAlertEmail({
  alarmName = ALERT_ALARM_NAME,
  severity = ALERT_SEVERITY as 'CRITICAL' | 'WARNING',
  service = ALERT_SERVICE,
  description = ALERT_DESCRIPTION,
  timestamp = ALERT_TIMESTAMP,
  dashboardUrl = ALERT_DASHBOARD_URL,
}: ServiceAlertEmailProps) {
  return (
    <EmailLayout
      preview={`Alerta de servicio — ${severity}: ${alarmName}`}
      footer={footerCopy}
    >
      <Section className="py-8 px-8">
        <Heading className="text-primary-dark text-2xl font-bold m-0 mb-2">
          Alerta de servicio
        </Heading>
        <Text className="text-neutral-600 text-base leading-relaxed mt-2 mb-6 m-0">
          Se ha activado una alarma en la infraestructura de Financial
          Management. Revisa los detalles a continuacion y toma las acciones
          necesarias.
        </Text>

        <ServiceAlertBlock
          alarmName={alarmName}
          severity={severity}
          service={service}
          description={description}
          timestamp={timestamp}
          dashboardUrl={dashboardUrl}
          labels={{
            alarm: 'Alarma',
            service: 'Servicio',
            time: 'Hora',
            details: 'Detalles',
            viewDashboard: 'Ver Dashboard',
          }}
        />

        <Hr className="border-neutral-200 my-6" />

        <Text className="text-neutral-500 text-sm leading-relaxed m-0">
          Esta es una notificacion automatica de CloudWatch. Si crees que es un
          falso positivo, revisa el dashboard para mas contexto. Las alarmas
          usan &quot;2 de 3 periodos de evaluacion&quot; para reducir ruido.
        </Text>
      </Section>
    </EmailLayout>
  );
}

ServiceAlertEmail.PreviewProps = {
  alarmName: 'API-5xx-Errors',
  severity: 'CRITICAL',
  service: 'API Gateway',
  description: 'Umbral superado: 8 puntos de datos superaron el umbral (5.0)',
  timestamp: '2026-04-08T10:00:00.000Z',
  dashboardUrl: 'https://console.aws.amazon.com/cloudwatch/home#dashboards',
} satisfies ServiceAlertEmailProps;
