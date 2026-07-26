import { Construct } from 'constructs';
import { MonitoringStack } from './monitoring-stack';

const mockAlarm = { addAlarmAction: jest.fn() };
const mockCompositeAlarm = { addAlarmAction: jest.fn() };
const mockDashboard = { addWidgets: jest.fn() };
const mockTopic = {
  addSubscription: jest.fn(),
  addToResourcePolicy: jest.fn(),
  topicArn: 'arn:aws:sns:us-east-1:123:topic',
};

jest.mock('aws-cdk-lib', () => {
  const MockStack = class {
    stackName = '';
    node = { addDependency: jest.fn(), children: [] };
    constructor(_scope: unknown, _id: string, props: Record<string, unknown>) {
      this.stackName = (props?.stackName as string) ?? 'Mock';
    }
  };
  return {
    Stack: MockStack,
    CfnOutput: jest.fn(),
    Duration: {
      minutes: (m: number) => m * 60,
      seconds: (s: number) => s,
      hours: (h: number) => h * 3600,
    },
  };
});

jest.mock('aws-cdk-lib/aws-cloudwatch', () => ({
  Alarm: jest.fn().mockImplementation(() => mockAlarm),
  AlarmRule: {
    anyOf: jest.fn(),
    fromAlarm: jest.fn(),
  },
  AlarmState: { ALARM: 'ALARM' },
  ComparisonOperator: { GREATER_THAN_THRESHOLD: 'GREATER_THAN_THRESHOLD' },
  CompositeAlarm: jest.fn().mockImplementation(() => mockCompositeAlarm),
  Dashboard: jest.fn().mockImplementation(() => mockDashboard),
  GraphWidget: jest.fn(),
  LogQueryWidget: jest.fn(),
  Metric: jest.fn().mockImplementation(() => ({
    with: jest.fn().mockReturnThis(),
  })),
  TextWidget: jest.fn(),
  TreatMissingData: { NOT_BREACHING: 'NOT_BREACHING' },
  AlarmStatusWidget: jest.fn(),
}));

jest.mock('aws-cdk-lib/aws-cloudwatch-actions', () => ({
  SnsAction: jest.fn(),
}));

jest.mock('aws-cdk-lib/aws-sns', () => ({
  Topic: jest.fn().mockImplementation(() => mockTopic),
}));

jest.mock('aws-cdk-lib/aws-sns-subscriptions', () => ({
  LambdaSubscription: jest.fn(),
}));

jest.mock('aws-cdk-lib/aws-lambda', () => ({
  Runtime: { NODEJS_24_X: 'nodejs24.x' },
  Tracing: { ACTIVE: 'Active' },
}));

jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => ({
  NodejsFunction: jest.fn().mockImplementation(() => ({
    addToRolePolicy: jest.fn(),
  })),
  OutputFormat: { ESM: 'esm' },
}));

jest.mock('aws-cdk-lib/aws-logs', () => ({
  LogGroup: jest.fn(),
  RetentionDays: { THREE_MONTHS: 90 },
}));

jest.mock('aws-cdk-lib/aws-iam', () => ({
  PolicyStatement: jest.fn(),
  ServicePrincipal: jest.fn(),
}));

jest.mock('aws-cdk-lib/aws-events', () => ({
  Rule: jest.fn(),
  EventPattern: jest.fn(),
}));

jest.mock('aws-cdk-lib/aws-events-targets', () => ({
  SnsTopic: jest.fn(),
}));

jest.mock('@utils/cross-version', () => ({
  importFromVersion: jest.fn(
    (_scope: unknown, _v: string, _stack: string, key: string) =>
      `imported-${key}`,
  ),
}));

const app = { node: { tryGetContext: jest.fn(), children: [] } };

const defaultProps = {
  version: 'v3',
  stackName: 'Monitoring',
  description: 'Monitoring stack',
  alertEmail: 'alerts@example.com',
  alertFromEmail: 'noreply@example.com',
  dashboardUrl: 'https://console.aws.amazon.com/cloudwatch',
  stage: 'dev',
};

describe('MonitoringStack', () => {
  beforeEach(() => jest.clearAllMocks());

  test('instantiates without throwing', () => {
    expect(
      () =>
        new MonitoringStack(
          app as unknown as Construct,
          'MonitoringStack',
          defaultProps,
        ),
    ).not.toThrow();
  });

  test('creates SNS topic with Lambda subscription', () => {
    new MonitoringStack(
      app as unknown as Construct,
      'MonitoringStack',
      defaultProps,
    );

    const { Topic: MockTopic } = jest.requireMock('aws-cdk-lib/aws-sns') as {
      Topic: jest.Mock;
    };
    expect(MockTopic).toHaveBeenCalledTimes(1);
    // Only Lambda subscription (SES handles email)
    expect(mockTopic.addSubscription).toHaveBeenCalledTimes(1);
  });

  test('creates API Gateway alarms (5xx, latency) but no 4xx alarm', () => {
    const { Alarm: MockAlarm } = jest.requireMock(
      'aws-cdk-lib/aws-cloudwatch',
    ) as { Alarm: jest.Mock };
    MockAlarm.mockClear();

    new MonitoringStack(
      app as unknown as Construct,
      'MonitoringStack',
      defaultProps,
    );

    const alarmNames = MockAlarm.mock.calls.map(
      (c: unknown[]) => (c[2] as Record<string, unknown>).alarmName as string,
    );
    expect(alarmNames).toContain('Monitoring-Api-5xx-Errors');
    expect(alarmNames).toContain('Monitoring-Api-Latency-High');
    // 4xx is a CLIENT fault, not actionable by an alert — dashboard only.
    expect(alarmNames).not.toContain('Monitoring-Api-4xx-Spike');
  });

  test('creates Lambda error alarms per service, and no throttle alarms', () => {
    const { Alarm: MockAlarm } = jest.requireMock(
      'aws-cdk-lib/aws-cloudwatch',
    ) as { Alarm: jest.Mock };
    MockAlarm.mockClear();

    new MonitoringStack(
      app as unknown as Construct,
      'MonitoringStack',
      defaultProps,
    );

    const alarmNames = MockAlarm.mock.calls.map(
      (c: unknown[]) => (c[2] as Record<string, unknown>).alarmName as string,
    );

    for (const service of ['Expenses', 'Documents', 'Currencies', 'Users']) {
      expect(alarmNames).toContain(`Monitoring-Lambda-${service}-Errors`);
    }
    expect(alarmNames).toContain('Monitoring-Lambda-UpdateRates-Errors');

    // No Lambda sets reservedConcurrentExecutions, so throttling can only come
    // from the 1000-concurrency account limit — unreachable here. Throttles
    // stay on the dashboard widget instead of paying per alarm.
    expect(alarmNames.filter((n) => n.endsWith('-Throttles'))).toHaveLength(0);
  });

  test('creates Cognito trigger alarms', () => {
    const { Alarm: MockAlarm } = jest.requireMock(
      'aws-cdk-lib/aws-cloudwatch',
    ) as { Alarm: jest.Mock };
    MockAlarm.mockClear();

    new MonitoringStack(
      app as unknown as Construct,
      'MonitoringStack',
      defaultProps,
    );

    const alarmNames = MockAlarm.mock.calls.map(
      (c: unknown[]) => (c[2] as Record<string, unknown>).alarmName as string,
    );

    for (const trigger of ['PreSignUp', 'CustomMessage', 'UserSync']) {
      expect(alarmNames).toContain(`Monitoring-Cognito-${trigger}-Errors`);
    }
  });

  test('all alarms have SNS action attached', () => {
    mockAlarm.addAlarmAction.mockClear();

    const stack = new MonitoringStack(
      app as unknown as Construct,
      'MonitoringStack',
      defaultProps,
    );

    expect(mockAlarm.addAlarmAction).toHaveBeenCalledTimes(stack.alarms.length);
  });

  test('creates CloudWatch dashboard with widgets', () => {
    mockDashboard.addWidgets.mockClear();

    new MonitoringStack(
      app as unknown as Construct,
      'MonitoringStack',
      defaultProps,
    );

    // Header + API section header + API widgets + Lambda header + Lambda widgets x2
    // + Cognito header + Cognito widgets + Amplify header + Amplify widgets
    // + Alarms header + Alarms widget = 12 addWidgets calls
    expect(mockDashboard.addWidgets.mock.calls.length).toBeGreaterThanOrEqual(
      10,
    );
  });

  test('total alarm count is correct', () => {
    const stack = new MonitoringStack(
      app as unknown as Construct,
      'MonitoringStack',
      defaultProps,
    );

    // Every alarm here is a billable alarm-metric ($0.10/month each), so the
    // count is asserted explicitly to keep cost changes visible in review.
    //
    // 2 API (5xx + latency; no 4xx) + 11 Lambda errors (5 services + 6 chat)
    // + 3 Cognito triggers
    // + 2 chat Step Functions (ExecutionsFailed + ExecutionsTimedOut)
    // + 2 AppSync Events (5XXError + FailedEvents)
    // + 3 chat resilience (LatencyP90High + ExecutionsAborted + PublishFailed)
    // Total = 23
    // (the CompositeAlarm "Chat-Unhealthy" is NOT pushed into this.alarms;
    //  it is billed separately at a flat $0.50/month)
    expect(stack.alarms).toHaveLength(23);
  });

  test('creates AI chat workflow and AppSync Events alarms', () => {
    const { Alarm: MockAlarm } = jest.requireMock(
      'aws-cdk-lib/aws-cloudwatch',
    ) as { Alarm: jest.Mock };
    MockAlarm.mockClear();

    new MonitoringStack(
      app as unknown as Construct,
      'MonitoringStack',
      defaultProps,
    );

    const alarmNames = MockAlarm.mock.calls.map(
      (c: unknown[]) => (c[2] as Record<string, unknown>).alarmName as string,
    );
    expect(alarmNames).toContain('Monitoring-ChatWorkflow-ExecutionsFailed');
    expect(alarmNames).toContain('Monitoring-ChatWorkflow-ExecutionsTimedOut');
    expect(alarmNames).toContain('Monitoring-AppSyncEvents-5xx-Errors');
    expect(alarmNames).toContain('Monitoring-AppSyncEvents-FailedEvents');
  });

  test('creates chat resilience alarms (latency p90, aborted, publish-failed)', () => {
    const { Alarm: MockAlarm } = jest.requireMock(
      'aws-cdk-lib/aws-cloudwatch',
    ) as { Alarm: jest.Mock };
    MockAlarm.mockClear();

    new MonitoringStack(
      app as unknown as Construct,
      'MonitoringStack',
      defaultProps,
    );

    const alarmNames = MockAlarm.mock.calls.map(
      (c: unknown[]) => (c[2] as Record<string, unknown>).alarmName as string,
    );
    expect(alarmNames).toContain('Monitoring-ChatWorkflow-LatencyP90High');
    expect(alarmNames).toContain('Monitoring-ChatWorkflow-ExecutionsAborted');
    expect(alarmNames).toContain('Monitoring-Chat-PublishFailed');
  });

  test('creates a composite "Chat Unhealthy" alarm with SNS action', () => {
    const { CompositeAlarm: MockCompositeAlarm } = jest.requireMock(
      'aws-cdk-lib/aws-cloudwatch',
    ) as { CompositeAlarm: jest.Mock };
    MockCompositeAlarm.mockClear();
    mockCompositeAlarm.addAlarmAction.mockClear();

    const stack = new MonitoringStack(
      app as unknown as Construct,
      'MonitoringStack',
      defaultProps,
    );

    expect(MockCompositeAlarm).toHaveBeenCalledTimes(1);
    const compositeProps = MockCompositeAlarm.mock.calls[0][2] as Record<
      string,
      unknown
    >;
    expect(compositeProps.compositeAlarmName).toBe('Monitoring-Chat-Unhealthy');
    expect(mockCompositeAlarm.addAlarmAction).toHaveBeenCalledTimes(1);
    // Exposed separately from `alarms` so it can drive its own dashboard widget.
    expect(stack.chatUnhealthyAlarm).toBe(mockCompositeAlarm);
    expect(stack.alarms).not.toContain(mockCompositeAlarm);
  });

  test('stackName follows BaseStack convention', () => {
    const stack = new MonitoringStack(
      app as unknown as Construct,
      'MonitoringStack',
      defaultProps,
    );
    expect(stack.stackName).toBe('FinancialManagement-v3-Monitoring');
  });
});
