import { MetricsFilterBar } from '.';

describe('MetricsFilterBar', () => {
  it('exports a function component', () => {
    expect(typeof MetricsFilterBar).toBe('function');
  });

  it('has the expected name', () => {
    expect(MetricsFilterBar.name).toBe('MetricsFilterBar');
  });
});
