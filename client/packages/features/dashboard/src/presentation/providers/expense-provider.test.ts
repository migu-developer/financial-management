import { ExpenseProvider, useExpenses } from './expense-provider';

describe('ExpenseProvider', () => {
  it('exports ExpenseProvider as a function component', () => {
    expect(typeof ExpenseProvider).toBe('function');
  });

  it('exports useExpenses as a function', () => {
    expect(typeof useExpenses).toBe('function');
  });
});
