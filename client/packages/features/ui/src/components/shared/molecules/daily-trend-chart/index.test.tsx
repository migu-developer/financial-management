import { DailyTrendChart } from '.';

describe('DailyTrendChart', () => {
  it('exports a function component', () => {
    expect(typeof DailyTrendChart).toBe('function');
  });

  it('has the expected name', () => {
    expect(DailyTrendChart.name).toBe('DailyTrendChart');
  });
});
