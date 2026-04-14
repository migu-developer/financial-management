import { Column, Link, Row, Section, Text } from '@react-email/components';

export interface ServiceAlertBlockProps {
  alarmName: string;
  severity: 'CRITICAL' | 'WARNING';
  service: string;
  description: string;
  timestamp: string;
  dashboardUrl: string;
}

const defaultStyle = {
  bg: 'bg-yellow-50',
  text: 'text-yellow-700',
  border: 'border-yellow-300',
};

const severityStyles: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  CRITICAL: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-300',
  },
  WARNING: defaultStyle,
};

export function ServiceAlertBlock({
  alarmName,
  severity,
  service,
  description,
  timestamp,
  dashboardUrl,
}: ServiceAlertBlockProps) {
  const style = severityStyles[severity] ?? defaultStyle;

  return (
    <Section
      className={`${style.bg} border ${style.border} rounded-lg p-4 mb-4`}
    >
      <Row className="mb-2">
        <Column>
          <Text className={`${style.text} text-sm font-bold m-0`}>
            {severity}
          </Text>
        </Column>
      </Row>

      <Row className="mb-1">
        <Column className="w-[120px]">
          <Text className="text-neutral-500 text-sm m-0 font-medium">
            Alarm
          </Text>
        </Column>
        <Column>
          <Text className="text-neutral-800 text-sm m-0 font-semibold">
            {alarmName}
          </Text>
        </Column>
      </Row>

      <Row className="mb-1">
        <Column className="w-[120px]">
          <Text className="text-neutral-500 text-sm m-0 font-medium">
            Service
          </Text>
        </Column>
        <Column>
          <Text className="text-neutral-800 text-sm m-0">{service}</Text>
        </Column>
      </Row>

      <Row className="mb-1">
        <Column className="w-[120px]">
          <Text className="text-neutral-500 text-sm m-0 font-medium">Time</Text>
        </Column>
        <Column>
          <Text className="text-neutral-800 text-sm m-0">{timestamp}</Text>
        </Column>
      </Row>

      <Row className="mb-3">
        <Column className="w-[120px]">
          <Text className="text-neutral-500 text-sm m-0 font-medium">
            Details
          </Text>
        </Column>
        <Column>
          <Text className="text-neutral-800 text-sm m-0">{description}</Text>
        </Column>
      </Row>

      {dashboardUrl && dashboardUrl !== '#' && (
        <Row>
          <Column>
            <Link
              href={dashboardUrl}
              className="text-primary-dark text-sm font-medium underline"
            >
              View Dashboard
            </Link>
          </Column>
        </Row>
      )}
    </Section>
  );
}
