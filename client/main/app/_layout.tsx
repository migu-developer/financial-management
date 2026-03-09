import '@packages/i18n';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar, StatusBarStyle } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useState } from 'react';
import 'react-native-reanimated';

import '@/styles/global.css';
import { ROUTE_NAMES } from '@/utils/route';
import { PreferencesProvider } from './providers/preferences-provider';

SplashScreen.preventAutoHideAsync();

function StatusBarDisplay(): React.ReactNode {
  const { colorScheme } = useColorScheme();

  return <StatusBar style={colorScheme as StatusBarStyle} />;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  const handleReady = useCallback(async () => {
    setReady(true);
    await SplashScreen.hideAsync();
  }, []);

  return (
    <PreferencesProvider onReady={handleReady}>
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
    </PreferencesProvider>
  );
}
