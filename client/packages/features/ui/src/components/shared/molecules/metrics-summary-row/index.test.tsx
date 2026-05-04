import { MetricsSummaryRow } from '.';

describe('MetricsSummaryRow', () => {
  it('exports a function component', () => {
    expect(typeof MetricsSummaryRow).toBe('function');
  });

  it('has the expected name', () => {
    expect(MetricsSummaryRow.name).toBe('MetricsSummaryRow');
  });
});
