import '@packages/i18n';

import { Stack } from 'expo-router';
import { preventAutoHideAsync, hideAsync } from 'expo-splash-screen';
import { StatusBar, StatusBarStyle } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import 'react-native-reanimated';

import '@/styles/global.css';
import { ROUTE_NAMES } from '@/utils/route';
import { AuthProvider, initAuthStorage } from '@features/auth';
import { PreferencesProvider } from './providers/preferences-provider';
import { useThemeActions } from '@features/ui';

preventAutoHideAsync();

// Hydrate Cognito storage adapter from AsyncStorage before any auth operations.
// Starts at module scope; awaited in handleReady before showing content.
const authStorageReady = initAuthStorage();

function StatusBarDisplay(): React.ReactNode {
  const { colorScheme } = useThemeActions();

  return <StatusBar style={colorScheme as StatusBarStyle} />;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  const handleReady = useCallback(async () => {
    await authStorageReady;
    setReady(true);
    await hideAsync();
  }, []);

  return (
    <PreferencesProvider onReady={handleReady}>
      <AuthProvider>
        {ready && (
          <>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name={ROUTE_NAMES.index} />
              <Stack.Screen name={ROUTE_NAMES.landing} />
              <Stack.Screen name={ROUTE_NAMES.auth} />
              <Stack.Screen name={ROUTE_NAMES.dashboard} />
              <Stack.Screen name={ROUTE_NAMES.privacy} />
              <Stack.Screen name={ROUTE_NAMES.terms} />
              <Stack.Screen name={ROUTE_NAMES.contact} />
              <Stack.Screen name={ROUTE_NAMES.notFound} />
            </Stack>
            <StatusBarDisplay />
          </>
        )}
      </AuthProvider>
    </PreferencesProvider>
  );
}
