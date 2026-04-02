import { Redirect, Stack, useRouter } from 'expo-router';

import { useAuth } from '@features/auth';
import {
  DashboardProvider,
  DashboardWebLayout,
  DashboardMobileLayout,
} from '@features/dashboard';
import { ROUTES } from '@/utils/route';
import { isWeb } from '@packages/utils/src';
import { useCallback, useMemo } from 'react';

const NAVIGATE_MAP: Record<string, string> = {
  home: ROUTES.dashboard.home,
  expenses: ROUTES.dashboard.expenses,
};

export default function DashboardLayout() {
  const { session, loading, user, signOut } = useAuth();
  const router = useRouter();

  const platformIsWeb = useMemo<boolean>(() => isWeb(), []);

  const handleNavigate = useCallback(
    (route: string) => {
      const path = NAVIGATE_MAP[route];
      if (path) router.push(path as never);
    },
    [router],
  );

  if (!loading && !session) {
    return <Redirect href={ROUTES.authLogin as never} />;
  }

  const dashboardUser = user
    ? { userId: user.userId, fullname: user.fullname, email: user.email }
    : null;

  const Layout = platformIsWeb ? DashboardWebLayout : DashboardMobileLayout;

  return (
    <DashboardProvider user={dashboardUser} onSignOut={signOut}>
      <Layout onNavigate={handleNavigate}>
        <Stack screenOptions={{ headerShown: false }} />
      </Layout>
    </DashboardProvider>
  );
}
