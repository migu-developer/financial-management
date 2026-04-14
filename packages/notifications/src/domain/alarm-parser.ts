import type {
  AlertPayload,
  AlertSeverity,
  CloudWatchAlarmMessage,
} from './types';

const NAMESPACE_TO_SERVICE: Record<string, string> = {
  'AWS/ApiGateway': 'API Gateway',
  'AWS/Lambda': 'Lambda',
  'AWS/AmplifyHosting': 'Amplify',
  'AWS/Cognito': 'Cognito',
};

const CRITICAL_METRICS = new Set([
  '5XXError',
  'Errors',
  'Throttles',
  '5xxErrors',
]);

function resolveSeverity(metricName: string): AlertSeverity {
  return CRITICAL_METRICS.has(metricName) ? 'CRITICAL' : 'WARNING';
}

function resolveService(alarm: CloudWatchAlarmMessage): string {
  const ns = alarm.Trigger.Namespace;
  const base = NAMESPACE_TO_SERVICE[ns] ?? ns;

  if (ns === 'AWS/Lambda') {
    const fnDim = alarm.Trigger.Dimensions?.find(
      (d) => d.name === 'FunctionName',
    );
    return fnDim ? `Lambda (${fnDim.value})` : base;
  }

  return base;
}

export function parseAlarmMessage(
  raw: string,
  dashboardUrl: string,
): AlertPayload {
  const alarm = JSON.parse(raw) as CloudWatchAlarmMessage;
  return {
    alarmName: alarm.AlarmName,
    severity: resolveSeverity(alarm.Trigger.MetricName),
    service: resolveService(alarm),
    description: alarm.NewStateReason,
    timestamp: alarm.StateChangeTime,
    dashboardUrl,
  };
}
