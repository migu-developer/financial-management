import { TopExpensesList } from '.';

describe('TopExpensesList', () => {
  it('exports a function component', () => {
    expect(typeof TopExpensesList).toBe('function');
  });

  it('has the expected name', () => {
    expect(TopExpensesList.name).toBe('TopExpensesList');
  });
});
