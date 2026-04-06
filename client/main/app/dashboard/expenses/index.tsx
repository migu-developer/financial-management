import { useCallback } from 'react';
import { ExpensesPage } from '@features/dashboard';
import { ExpenseProvider } from '@features/dashboard/presentation/providers/expense-provider';
import { useAuth } from '@features/auth';

function getApiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not configured. Set it in your .env file.',
    );
  }
  return url;
}

const API_BASE_URL = getApiBaseUrl();

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
