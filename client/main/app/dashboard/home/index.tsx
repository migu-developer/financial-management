import { useCallback } from 'react';
import { DashboardHomePage } from '@features/dashboard';
import { MetricsProvider } from '@features/dashboard/presentation/providers/metrics-provider';
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
