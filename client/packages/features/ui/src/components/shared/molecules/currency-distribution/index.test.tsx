import { CurrencyDistribution } from '.';

describe('CurrencyDistribution', () => {
  it('exports a function component', () => {
    expect(typeof CurrencyDistribution).toBe('function');
  });

  it('has the expected name', () => {
    expect(CurrencyDistribution.name).toBe('CurrencyDistribution');
  });
});
