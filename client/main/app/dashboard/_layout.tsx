import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@features/auth';
import {
  DashboardProvider,
  DashboardWebLayout,
  DashboardMobileLayout,
} from '@features/dashboard';
import { ROUTES } from '@/utils/route';
import { isWeb } from '@packages/utils/src';
import { useMemo } from 'react';

export default function DashboardLayout() {
  const { session, loading, user, signOut } = useAuth();

  const platformIsWeb = useMemo<boolean>(() => isWeb(), []);

  if (!loading && !session) {
    return <Redirect href={ROUTES.authLogin as never} />;
  }

  const dashboardUser = user
    ? { userId: user.userId, fullname: user.fullname, email: user.email }
    : null;

  const Layout = platformIsWeb ? DashboardWebLayout : DashboardMobileLayout;

  return (
    <DashboardProvider user={dashboardUser} onSignOut={signOut}>
      <Layout>
        <Stack screenOptions={{ headerShown: false }} />
      </Layout>
    </DashboardProvider>
  );
}
