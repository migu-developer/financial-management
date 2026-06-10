import { useCallback } from 'react';
import { ExpensesPage } from '@features/dashboard';
import { ExpenseProvider } from '@features/dashboard/presentation/providers/expense-provider';
import { useAuth } from '@features/auth';
import { requireEnv } from '@packages/models/shared/utils/require-env';

const API_BASE_URL = requireEnv(
  process.env.EXPO_PUBLIC_API_URL,
  'EXPO_PUBLIC_API_URL',
);

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
