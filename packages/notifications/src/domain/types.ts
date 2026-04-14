export interface CloudWatchAlarmMessage {
  AlarmName: string;
  AlarmDescription?: string;
  NewStateValue: 'ALARM' | 'OK' | 'INSUFFICIENT_DATA';
  NewStateReason: string;
  StateChangeTime: string;
  Trigger: {
    MetricName: string;
    Namespace: string;
    Period: number;
    Threshold: number;
    Statistic?: string;
    Dimensions?: Array<{ name: string; value: string }>;
  };
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

export type AlertSeverity = 'CRITICAL' | 'WARNING';

export interface AlertPayload {
  alarmName: string;
  severity: AlertSeverity;
  service: string;
  description: string;
  timestamp: string;
  dashboardUrl: string;
}
