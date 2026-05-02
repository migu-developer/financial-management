jest.mock('@aws-lambda-powertools/tracer', () => ({
  Tracer: jest.fn().mockImplementation(() => ({
    annotateColdStart: jest.fn(),
    putAnnotation: jest.fn(),
    captureAWSv3Client: jest.fn((client: unknown) => client),
  })),
}));

jest.mock('../infrastructure/ses-sender', () => ({
  sendAlertEmail: jest.fn().mockResolvedValue(undefined),
}));

import { handler } from './notify';

const makeSNSEvent = (message: string) => ({
  Records: [
    {
      Sns: {
        Message: message,
        Subject: 'ALARM: Test',
        Timestamp: '2026-04-08T10:00:00Z',
      },
    },
  ],
});

const validAlarmMessage = JSON.stringify({
  AlarmName: 'Api-5xx-Errors',
  NewStateValue: 'ALARM',
  NewStateReason: 'Threshold Crossed',
  StateChangeTime: '2026-04-08T10:00:00Z',
  Trigger: {
    MetricName: '5XXError',
    Namespace: 'AWS/ApiGateway',
    Period: 60,
    Threshold: 5,
  },
});

describe('notification handler', () => {
  it('processes SNS event and calls sendAlertEmail', async () => {
    const { sendAlertEmail } = jest.requireMock(
      '../infrastructure/ses-sender',
    ) as { sendAlertEmail: jest.Mock };
    sendAlertEmail.mockClear();

    await handler(makeSNSEvent(validAlarmMessage));

    expect(sendAlertEmail).toHaveBeenCalledTimes(1);
    expect(sendAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        alarmName: 'Api-5xx-Errors',
        severity: 'CRITICAL',
        service: 'API Gateway',
      }),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        ses: expect.anything(),
        s3: expect.anything(),
      }),
    );
  });

  it('does not throw on invalid message', async () => {
    await expect(
      handler(makeSNSEvent('invalid json')),
    ).resolves.toBeUndefined();
  });

  it('processes multiple records', async () => {
    const { sendAlertEmail } = jest.requireMock(
      '../infrastructure/ses-sender',
    ) as { sendAlertEmail: jest.Mock };
    sendAlertEmail.mockClear();

    const event = {
      Records: [
        {
          Sns: {
            Message: validAlarmMessage,
            Timestamp: '2026-04-08T10:00:00Z',
          },
        },
        {
          Sns: {
            Message: validAlarmMessage,
            Timestamp: '2026-04-08T10:01:00Z',
          },
        },
      ],
    };

    await handler(event);
    expect(sendAlertEmail).toHaveBeenCalledTimes(2);
  });
});
