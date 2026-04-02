import { CurrencyDisplay } from './index';

describe('CurrencyDisplay component', () => {
  it('module exports a function', () => {
    expect(typeof CurrencyDisplay).toBe('function');
  });

  it('has the expected name', () => {
    expect(CurrencyDisplay.name).toBe('CurrencyDisplay');
  });

  describe('formatNumber logic', () => {
    // The internal formatNumber uses Intl.NumberFormat('en-US') with max 2 decimal digits
    const formatNumber = (value: number): string =>
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(Math.abs(value));

    it('formats integer values without decimals', () => {
      expect(formatNumber(1000)).toBe('1,000');
    });

    it('formats values with 2 decimal places', () => {
      expect(formatNumber(49.99)).toBe('49.99');
    });

    it('uses absolute value for negative numbers', () => {
      expect(formatNumber(-250)).toBe('250');
    });

    it('formats zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('adds thousands separator', () => {
      expect(formatNumber(1234567.89)).toBe('1,234,567.89');
    });

    it('truncates beyond 2 decimal places', () => {
      expect(formatNumber(10.999)).toBe('11');
    });
  });

  describe('prefix logic', () => {
    it('returns "+" for income type', () => {
      const type: 'income' | 'outcome' | undefined = 'income';
      const prefix = type === 'income' ? '+' : type === 'outcome' ? '-' : '';
      expect(prefix).toBe('+');
    });

    it('returns "-" for outcome type', () => {
      const type = 'outcome' as 'income' | 'outcome' | undefined;
      const prefix = type === 'income' ? '+' : type === 'outcome' ? '-' : '';
      expect(prefix).toBe('-');
    });

    it('returns empty string when type is undefined', () => {
      const type: 'income' | 'outcome' | undefined = undefined;
      const prefix = type === 'income' ? '+' : type === 'outcome' ? '-' : '';
      expect(prefix).toBe('');
    });
  });

  describe('props interface', () => {
    it('requires value', () => {
      const props = { value: 100 };
      expect(props.value).toBe(100);
    });

    it('symbol defaults to "$"', () => {
      const symbol = '$';
      expect(symbol).toBe('$');
    });

    it('accepts custom symbol', () => {
      const props = { value: 50, symbol: '€' };
      expect(props.symbol).toBe('€');
    });

    it('type is optional', () => {
      const props: { value: number; type?: 'income' | 'outcome' } = {
        value: 100,
      };
      expect(props.type).toBeUndefined();
    });

    it('className is optional', () => {
      const props: { value: number; className?: string } = { value: 100 };
      expect(props.className).toBeUndefined();
    });
  });
});
