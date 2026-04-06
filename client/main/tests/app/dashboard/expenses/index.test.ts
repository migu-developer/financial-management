import DashboardExpensesScreen from '@/app/dashboard/expenses/index';

describe('app/dashboard/expenses/index', () => {
  it('exports a default function', () => {
    expect(typeof DashboardExpensesScreen).toBe('function');
  });

  it('has the expected name', () => {
    expect(DashboardExpensesScreen.name).toBe('DashboardExpensesScreen');
  });
});
