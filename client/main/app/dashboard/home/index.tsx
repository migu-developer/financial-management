import { useCallback } from 'react';
import { DashboardHomePage } from '@features/dashboard';
import { MetricsProvider } from '@features/dashboard/presentation/providers/metrics-provider';
import { useAuth } from '@features/auth';
import { requireEnv } from '@packages/models/shared/utils/require-env';

const API_BASE_URL = requireEnv(
  process.env.EXPO_PUBLIC_API_URL,
  'EXPO_PUBLIC_API_URL',
);

export default function DashboardHomeScreen() {
  const { session } = useAuth();

  const getToken = useCallback(async () => {
    return session?.idToken ?? null;
  }, [session]);

  return (
    <MetricsProvider apiBaseUrl={API_BASE_URL} getToken={getToken}>
      <DashboardHomePage />
    </MetricsProvider>
  );
}
