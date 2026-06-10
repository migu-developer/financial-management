const mockAddMetric = jest.fn();
const mockPublishStoredMetrics = jest.fn();

jest.mock('@aws-lambda-powertools/metrics', () => ({
  Metrics: jest.fn().mockImplementation((opts: unknown) => ({
    options: opts,
    addMetric: mockAddMetric,
    publishStoredMetrics: mockPublishStoredMetrics,
  })),
  MetricUnit: { Count: 'Count', Milliseconds: 'Milliseconds' },
}));

import { Metrics } from '@aws-lambda-powertools/metrics';
import { MetricsServiceImplementation } from './MetricsServiceImp';

describe('MetricsServiceImplementation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates Metrics with the default namespace and the given service', () => {
    new MetricsServiceImplementation('chat');
    expect(Metrics).toHaveBeenCalledWith({
      namespace: 'FinancialManagement',
      serviceName: 'chat',
    });
  });

  it('count() adds a Count metric with default value 1', () => {
    const service = new MetricsServiceImplementation('chat');
    service.count('ChatExpenseCreated');
    expect(mockAddMetric).toHaveBeenCalledWith(
      'ChatExpenseCreated',
      'Count',
      1,
    );
  });

  it('durationMs() adds a Milliseconds metric', () => {
    const service = new MetricsServiceImplementation('chat');
    service.durationMs('QueryTime', 123);
    expect(mockAddMetric).toHaveBeenCalledWith(
      'QueryTime',
      'Milliseconds',
      123,
    );
  });

  it('publish() flushes stored metrics', () => {
    const service = new MetricsServiceImplementation('chat');
    service.publish();
    expect(mockPublishStoredMetrics).toHaveBeenCalledTimes(1);
  });
});
