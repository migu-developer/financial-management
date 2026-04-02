import { useCallback } from 'react';
import { ExpensesPage } from '@features/dashboard';
import { ExpenseProvider } from '@features/dashboard/presentation/providers/expense-provider';
import { useAuth } from '@features/auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export default function DashboardExpensesScreen() {
  const { session } = useAuth();

  const getToken = useCallback(async () => {
    return session?.idToken ?? null;
  }, [session]);

  return (
    <ExpenseProvider apiBaseUrl={API_BASE_URL} getToken={getToken}>
      <ExpensesPage />
    </ExpenseProvider>
  );
}
