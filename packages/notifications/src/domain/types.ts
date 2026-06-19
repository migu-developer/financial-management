export interface CloudWatchAlarmMessage {
  AlarmName: string;
  AlarmDescription?: string;
  NewStateValue: 'ALARM' | 'OK' | 'INSUFFICIENT_DATA';
  NewStateReason: string;
  StateChangeTime: string;
  /**
   * Present on metric alarms. **Absent on composite alarms** — those carry an
   * `AlarmRule` instead and have no single metric, so always guard before
   * reading `Trigger.*`.
   */
  Trigger?: {
    MetricName: string;
    Namespace: string;
    Period: number;
    Threshold: number;
    Statistic?: string;
    Dimensions?: Array<{ name: string; value: string }>;
  };
  /** Present on composite alarms (the boolean rule over child alarms). */
  AlarmRule?: string;
}

export interface AmplifyBuildEvent {
  source: 'aws.amplify';
  'detail-type': 'Amplify Deployment Status Change';
  detail: {
    appId: string;
    branchName: string;
    jobId: string;
    jobStatus: 'FAILED' | 'SUCCEED' | 'STARTED';
  };
  time: string;
}

export interface SNSEvent {
  Records: Array<{
    Sns: {
      Message: string;
      Subject?: string;
      Timestamp: string;
    };
  }>;
}

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface AlertPayload {
  alarmName: string;
  severity: AlertSeverity;
  service: string;
  description: string;
  timestamp: string;
  dashboardUrl: string;
}
