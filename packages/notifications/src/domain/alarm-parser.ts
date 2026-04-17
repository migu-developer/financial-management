import type {
  AlertPayload,
  AlertSeverity,
  AmplifyBuildEvent,
  CloudWatchAlarmMessage,
  SesEventMessage,
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

function isAmplifyBuildEvent(parsed: unknown): parsed is AmplifyBuildEvent {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'source' in parsed &&
    (parsed as AmplifyBuildEvent).source === 'aws.amplify'
  );
}

function isSesEvent(parsed: unknown): parsed is SesEventMessage {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'eventType' in parsed &&
    'mail' in parsed
  );
}

function parseAmplifyEvent(
  event: AmplifyBuildEvent,
  dashboardUrl: string,
): AlertPayload {
  const { appId, branchName, jobId, jobStatus } = event.detail;
  return {
    alarmName: `Amplify Build ${jobStatus}`,
    severity: jobStatus === 'FAILED' ? 'CRITICAL' : 'INFO',
    service: 'Amplify Hosting',
    description: `Build ${jobId} on branch "${branchName}" (app: ${appId}) status: ${jobStatus}`,
    timestamp: event.time,
    dashboardUrl,
  };
}

function parseSesEvent(
  event: SesEventMessage,
  dashboardUrl: string,
): AlertPayload {
  const { eventType, mail } = event;
  const severity: AlertSeverity =
    eventType === 'Bounce' || eventType === 'Complaint' ? 'WARNING' : 'INFO';

  let description = `SES ${eventType} for message ${mail.messageId} to ${mail.destination.join(', ')}`;
  if (event.bounce) {
    const recipients = event.bounce.bouncedRecipients
      .map((r) => r.emailAddress)
      .join(', ');
    description = `${event.bounce.bounceType}/${event.bounce.bounceSubType} bounce for: ${recipients}`;
  }
  if (event.complaint) {
    const recipients = event.complaint.complainedRecipients
      .map((r) => r.emailAddress)
      .join(', ');
    description = `Complaint (${event.complaint.complaintFeedbackType ?? 'unknown'}) from: ${recipients}`;
  }

  return {
    alarmName: `SES ${eventType}`,
    severity,
    service: 'SES Email',
    description,
    timestamp: mail.timestamp,
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

  if (isSesEvent(parsed)) {
    return parseSesEvent(parsed, dashboardUrl);
  }

  const alarm = parsed as CloudWatchAlarmMessage;
  return {
    alarmName: alarm.AlarmName,
    severity: resolveSeverity(alarm.Trigger.MetricName),
    service: resolveService(alarm),
    description: alarm.NewStateReason,
    timestamp: alarm.StateChangeTime,
    dashboardUrl,
  };
}
