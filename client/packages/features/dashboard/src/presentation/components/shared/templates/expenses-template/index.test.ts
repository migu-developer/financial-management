import { ExpensesTemplate } from '.';

describe('ExpensesTemplate', () => {
  it('exports a function component', () => {
    expect(typeof ExpensesTemplate).toBe('function');
  });

  it('has the expected name', () => {
    expect(ExpensesTemplate.name).toBe('ExpensesTemplate');
  });
});
