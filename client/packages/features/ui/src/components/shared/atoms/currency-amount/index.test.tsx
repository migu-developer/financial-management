import { CurrencyAmount } from '.';

describe('CurrencyAmount', () => {
  it('exports a function component', () => {
    expect(typeof CurrencyAmount).toBe('function');
  });

  it('has the expected name', () => {
    expect(CurrencyAmount.name).toBe('CurrencyAmount');
  });
});
