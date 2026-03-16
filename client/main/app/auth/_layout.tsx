import { Redirect, Stack, useSegments } from 'expo-router';

import { useAuth } from '@features/auth';
import { ROUTE_NAMES, ROUTES } from '@/utils/route';

export default function AuthLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();

  // Never redirect away from /auth/callback — it handles OAuth popup returns
  const isCallback = segments.includes(ROUTE_NAMES.callback as never);

  if (!loading && session && !isCallback) {
    return <Redirect href={ROUTES.dashboard.home as never} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
