import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@features/auth';
import { ROUTES } from '@/utils/route';

export default function AuthLayout() {
  const { session, loading } = useAuth();

  if (!loading && session) {
    return <Redirect href={ROUTES.dashboard.home as never} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
