import DashboardExpensesScreen from '@/app/dashboard/expenses/index';

process.env.EXPO_PUBLIC_API_URL =
  'https://test.execute-api.us-east-1.amazonaws.com/dev';

describe('app/dashboard/expenses/index', () => {
  it('exports a default function', () => {
    expect(typeof DashboardExpensesScreen).toBe('function');
  });

  it('has the expected name', () => {
    expect(DashboardExpensesScreen.name).toBe('DashboardExpensesScreen');
  });
});
