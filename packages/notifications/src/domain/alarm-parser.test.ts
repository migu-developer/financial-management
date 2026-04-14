import { parseAlarmMessage } from './alarm-parser';

const makeAlarmJson = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    AlarmName: 'Api-5xx-Errors',
    NewStateValue: 'ALARM',
    NewStateReason: 'Threshold Crossed: 8 datapoints > 5',
    StateChangeTime: '2026-04-08T10:00:00Z',
    Trigger: {
      MetricName: '5XXError',
      Namespace: 'AWS/ApiGateway',
      Period: 60,
      Threshold: 5,
    },
    ...overrides,
  });

describe('parseAlarmMessage', () => {
  it('parses API Gateway 5xx alarm', () => {
    const result = parseAlarmMessage(
      makeAlarmJson(),
      'https://dashboard.example.com',
    );
    expect(result.alarmName).toBe('Api-5xx-Errors');
    expect(result.severity).toBe('CRITICAL');
    expect(result.service).toBe('API Gateway');
    expect(result.description).toBe('Threshold Crossed: 8 datapoints > 5');
    expect(result.timestamp).toBe('2026-04-08T10:00:00Z');
    expect(result.dashboardUrl).toBe('https://dashboard.example.com');
  });

  it('resolves CRITICAL severity for error metrics', () => {
    const errors = parseAlarmMessage(
      makeAlarmJson({
        Trigger: {
          MetricName: 'Errors',
          Namespace: 'AWS/Lambda',
          Period: 60,
          Threshold: 3,
        },
      }),
      '',
    );
    expect(errors.severity).toBe('CRITICAL');

    const throttles = parseAlarmMessage(
      makeAlarmJson({
        Trigger: {
          MetricName: 'Throttles',
          Namespace: 'AWS/Lambda',
          Period: 60,
          Threshold: 0,
        },
      }),
      '',
    );
    expect(throttles.severity).toBe('CRITICAL');
  });

  it('resolves WARNING severity for non-critical metrics', () => {
    const result = parseAlarmMessage(
      makeAlarmJson({
        Trigger: {
          MetricName: 'Latency',
          Namespace: 'AWS/ApiGateway',
          Period: 60,
          Threshold: 5000,
        },
      }),
      '',
    );
    expect(result.severity).toBe('WARNING');

    const result4xx = parseAlarmMessage(
      makeAlarmJson({
        Trigger: {
          MetricName: '4XXError',
          Namespace: 'AWS/ApiGateway',
          Period: 60,
          Threshold: 50,
        },
      }),
      '',
    );
    expect(result4xx.severity).toBe('WARNING');
  });

  it('resolves Lambda service with function name from dimensions', () => {
    const result = parseAlarmMessage(
      makeAlarmJson({
        Trigger: {
          MetricName: 'Errors',
          Namespace: 'AWS/Lambda',
          Period: 60,
          Threshold: 3,
          Dimensions: [{ name: 'FunctionName', value: 'expenses-fn' }],
        },
      }),
      '',
    );
    expect(result.service).toBe('Lambda (expenses-fn)');
  });

  it('resolves Amplify service', () => {
    const result = parseAlarmMessage(
      makeAlarmJson({
        Trigger: {
          MetricName: '5xxErrors',
          Namespace: 'AWS/AmplifyHosting',
          Period: 300,
          Threshold: 5,
        },
      }),
      '',
    );
    expect(result.service).toBe('Amplify');
    expect(result.severity).toBe('CRITICAL');
  });

  it('uses namespace as fallback for unknown services', () => {
    const result = parseAlarmMessage(
      makeAlarmJson({
        Trigger: {
          MetricName: 'SomeMetric',
          Namespace: 'AWS/CustomNamespace',
          Period: 60,
          Threshold: 1,
        },
      }),
      '',
    );
    expect(result.service).toBe('AWS/CustomNamespace');
  });
});
