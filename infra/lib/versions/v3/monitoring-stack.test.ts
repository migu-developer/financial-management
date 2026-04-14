import { Construct } from 'constructs';
import { MonitoringStack } from './monitoring-stack';

const mockAlarm = { addAlarmAction: jest.fn() };
const mockDashboard = { addWidgets: jest.fn() };
const mockTopic = {
  addSubscription: jest.fn(),
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
    },
  };
});

jest.mock('aws-cdk-lib/aws-cloudwatch', () => ({
  Alarm: jest.fn().mockImplementation(() => mockAlarm),
  ComparisonOperator: { GREATER_THAN_THRESHOLD: 'GREATER_THAN_THRESHOLD' },
  Dashboard: jest.fn().mockImplementation(() => mockDashboard),
  GraphWidget: jest.fn(),
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
  Runtime: { NODEJS_22_X: 'nodejs22.x' },
  Tracing: { ACTIVE: 'Active' },
}));

jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => ({
  NodejsFunction: jest.fn().mockImplementation(() => ({
    addToRolePolicy: jest.fn(),
  })),
  OutputFormat: { ESM: 'esm' },
}));

jest.mock('aws-cdk-lib/aws-iam', () => ({
  PolicyStatement: jest.fn(),
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

  test('creates API Gateway alarms (5xx, 4xx, latency)', () => {
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
    expect(alarmNames).toContain('Monitoring-Api-4xx-Spike');
    expect(alarmNames).toContain('Monitoring-Api-Latency-High');
  });

  test('creates Lambda alarms per service (errors + throttles)', () => {
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
      expect(alarmNames).toContain(`Monitoring-Lambda-${service}-Throttles`);
    }
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

    // 3 API + (4 services × 2 each) + 3 Cognito triggers = 14
    expect(stack.alarms).toHaveLength(14);
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
