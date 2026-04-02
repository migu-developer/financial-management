import { ExpensesPage } from './index';

describe('ExpensesPage', () => {
  it('exports a function', () => {
    expect(typeof ExpensesPage).toBe('function');
  });

  it('has the expected name', () => {
    expect(ExpensesPage.name).toBe('ExpensesPage');
  });
});
