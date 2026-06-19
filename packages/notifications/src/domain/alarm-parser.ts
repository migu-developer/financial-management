import type {
  AlertPayload,
  AlertSeverity,
  AmplifyBuildEvent,
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

type AlarmTrigger = NonNullable<CloudWatchAlarmMessage['Trigger']>;

function resolveService(trigger: AlarmTrigger): string {
  const ns = trigger.Namespace;
  const base = NAMESPACE_TO_SERVICE[ns] ?? ns;

  if (ns === 'AWS/Lambda') {
    const fnDim = trigger.Dimensions?.find((d) => d.name === 'FunctionName');
    return fnDim ? `Lambda (${fnDim.value})` : base;
  }

  return base;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAmplifyBuildEvent(parsed: unknown): parsed is AmplifyBuildEvent {
  if (!isRecord(parsed)) return false;
  const detail = parsed.detail;
  return (
    parsed.source === 'aws.amplify' &&
    typeof parsed['detail-type'] === 'string' &&
    typeof parsed.time === 'string' &&
    isRecord(detail) &&
    typeof detail.appId === 'string' &&
    typeof detail.branchName === 'string' &&
    typeof detail.jobId === 'string' &&
    typeof detail.jobStatus === 'string'
  );
}

function parseAmplifyEvent(
  event: AmplifyBuildEvent,
  dashboardUrl: string,
): AlertPayload {
  const { appId, branchName, jobId, jobStatus } = event.detail;
  const stage = process.env['STAGE']?.toUpperCase() ?? '';
  return {
    alarmName: `Amplify Build ${jobStatus}`,
    severity: jobStatus === 'FAILED' ? 'CRITICAL' : 'INFO',
    service: 'Amplify Hosting',
    description: `[${stage}] Build ${jobId} on branch "${branchName}" (app: ${appId}) status: ${jobStatus}`,
    timestamp: event.time,
    dashboardUrl,
  };
}

export function parseAlarmMessage(
  raw: string,
  dashboardUrl: string,
): AlertPayload {
  const parsed = JSON.parse(raw) as unknown;

  if (isAmplifyBuildEvent(parsed)) {
    return parseAmplifyEvent(parsed, dashboardUrl);
  }

  const alarm = parsed as CloudWatchAlarmMessage;

  // Composite alarms have no `Trigger` / metric — they roll up child alarms via
  // an `AlarmRule`. Treat them as a CRITICAL, actionable signal instead of
  // crashing on `Trigger.MetricName` (undefined for composites).
  if (!alarm.Trigger) {
    return {
      alarmName: alarm.AlarmName,
      severity: 'CRITICAL',
      service: 'Composite alarm',
      description: alarm.NewStateReason,
      timestamp: alarm.StateChangeTime,
      dashboardUrl,
    };
  }

  return {
    alarmName: alarm.AlarmName,
    severity: resolveSeverity(alarm.Trigger.MetricName),
    service: resolveService(alarm.Trigger),
    description: alarm.NewStateReason,
    timestamp: alarm.StateChangeTime,
    dashboardUrl,
  };
}
