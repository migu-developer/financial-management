import { parseAlarmMessage } from './alarm-parser';

beforeAll(() => {
  process.env['STAGE'] = 'dev';
});

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

  it('parses Amplify FAILED build event as CRITICAL', () => {
    const event = JSON.stringify({
      source: 'aws.amplify',
      'detail-type': 'Amplify Deployment Status Change',
      time: '2026-04-17T12:00:00Z',
      detail: {
        appId: 'd1nzvcjpfquip1',
        branchName: 'main',
        jobId: '42',
        jobStatus: 'FAILED',
      },
    });
    const result = parseAlarmMessage(event, 'https://dashboard.example.com');
    expect(result.severity).toBe('CRITICAL');
    expect(result.alarmName).toBe('Amplify Build FAILED');
    expect(result.service).toBe('Amplify Hosting');
    expect(result.description).toContain('branch "main"');
    expect(result.description).toContain('42');
    expect(result.description).toContain('[DEV]');
  });

  it('parses Amplify SUCCEED build event as INFO', () => {
    const event = JSON.stringify({
      source: 'aws.amplify',
      'detail-type': 'Amplify Deployment Status Change',
      time: '2026-04-17T12:05:00Z',
      detail: {
        appId: 'd1nzvcjpfquip1',
        branchName: 'main',
        jobId: '42',
        jobStatus: 'SUCCEED',
      },
    });
    const result = parseAlarmMessage(event, '');
    expect(result.severity).toBe('INFO');
    expect(result.alarmName).toBe('Amplify Build SUCCEED');
  });

  it('parses Amplify STARTED build event as INFO', () => {
    const event = JSON.stringify({
      source: 'aws.amplify',
      'detail-type': 'Amplify Deployment Status Change',
      time: '2026-04-17T12:00:00Z',
      detail: {
        appId: 'd1nzvcjpfquip1',
        branchName: 'main',
        jobId: '42',
        jobStatus: 'STARTED',
      },
    });
    const result = parseAlarmMessage(event, '');
    expect(result.severity).toBe('INFO');
  });

  it('parses SES Bounce event as WARNING', () => {
    const event = JSON.stringify({
      eventType: 'Bounce',
      mail: {
        timestamp: '2026-04-17T12:00:00Z',
        source: 'noreply@migudev.com',
        destination: ['user@example.com'],
        messageId: 'msg-123',
      },
      bounce: {
        bounceType: 'Permanent',
        bounceSubType: 'General',
        bouncedRecipients: [{ emailAddress: 'user@example.com' }],
      },
    });
    const result = parseAlarmMessage(event, '');
    expect(result.severity).toBe('WARNING');
    expect(result.alarmName).toBe('SES Bounce');
    expect(result.service).toBe('SES Email');
    expect(result.description).toContain('Permanent/General');
    expect(result.description).toContain('user@example.com');
  });

  it('parses SES Complaint event as WARNING', () => {
    const event = JSON.stringify({
      eventType: 'Complaint',
      mail: {
        timestamp: '2026-04-17T12:00:00Z',
        source: 'noreply@migudev.com',
        destination: ['user@example.com'],
        messageId: 'msg-456',
      },
      complaint: {
        complainedRecipients: [{ emailAddress: 'user@example.com' }],
        complaintFeedbackType: 'abuse',
      },
    });
    const result = parseAlarmMessage(event, '');
    expect(result.severity).toBe('WARNING');
    expect(result.alarmName).toBe('SES Complaint');
    expect(result.description).toContain('abuse');
  });

  it('parses SES Delivery event as INFO', () => {
    const event = JSON.stringify({
      eventType: 'Delivery',
      mail: {
        timestamp: '2026-04-17T12:00:00Z',
        source: 'noreply@migudev.com',
        destination: ['user@example.com'],
        messageId: 'msg-789',
      },
    });
    const result = parseAlarmMessage(event, '');
    expect(result.severity).toBe('INFO');
    expect(result.alarmName).toBe('SES Delivery');
  });
});
