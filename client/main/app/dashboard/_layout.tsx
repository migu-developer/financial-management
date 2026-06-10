import { Redirect, Stack, useRouter } from 'expo-router';

import { useAuth } from '@features/auth';
import {
  DashboardProvider,
  DashboardWebLayout,
  DashboardMobileLayout,
} from '@features/dashboard';
import { ChatProvider } from '@features/dashboard/presentation/providers/chat-provider';
import { requireEnv } from '@packages/models/shared/utils/require-env';
import { ROUTES } from '@/utils/route';
import { isWeb } from '@packages/utils/src';
import { useCallback, useMemo } from 'react';

const NAVIGATE_MAP: Record<string, string> = {
  home: ROUTES.dashboard.home,
  expenses: ROUTES.dashboard.expenses,
};

// Read once at module load — values are baked into the bundle by Expo.
const API_BASE_URL = requireEnv(
  process.env.EXPO_PUBLIC_API_URL,
  'EXPO_PUBLIC_API_URL',
);
const APPSYNC_REALTIME_DNS = requireEnv(
  process.env.EXPO_PUBLIC_APPSYNC_REALTIME_DNS,
  'EXPO_PUBLIC_APPSYNC_REALTIME_DNS',
);
const APPSYNC_CHAT_NAMESPACE = requireEnv(
  process.env.EXPO_PUBLIC_APPSYNC_CHAT_NAMESPACE,
  'EXPO_PUBLIC_APPSYNC_CHAT_NAMESPACE',
);

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

  const getToken = useCallback(async () => {
    return session?.idToken ?? null;
  }, [session]);

  if (!loading && !session) {
    return <Redirect href={ROUTES.authLogin as never} />;
  }

  // The dashboard templates always render the AI chat drawer, and the drawer
  // calls `useChatContext()` at mount. Wait for the authenticated user before
  // rendering anything that could hit that hook.
  if (!user) {
    return null;
  }

  const dashboardUser = {
    userId: user.userId,
    fullname: user.fullname,
    email: user.email,
  };
  const Layout = platformIsWeb ? DashboardWebLayout : DashboardMobileLayout;

  return (
    <DashboardProvider user={dashboardUser} onSignOut={signOut}>
      <Layout onNavigate={handleNavigate}>
        <ChatProvider
          apiBaseUrl={API_BASE_URL}
          getToken={getToken}
          userId={user.userId}
          appSyncRealtimeDns={APPSYNC_REALTIME_DNS}
          appSyncNamespace={APPSYNC_CHAT_NAMESPACE}
        >
          <Stack screenOptions={{ headerShown: false }} />
        </ChatProvider>
      </Layout>
    </DashboardProvider>
  );
}
