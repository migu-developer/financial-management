import '@packages/i18n';

import { Stack } from 'expo-router';
import { StatusBar, StatusBarStyle } from 'expo-status-bar';
import 'react-native-reanimated';
import { isWeb } from '@packages/utils';

import { useColorScheme } from '@features/ui/hooks/use-color-scheme';
import { useColorScheme as useWebColorScheme } from '@features/ui/hooks/use-color-scheme.web';

import '@/styles/global.css';
import { ROUTE_NAMES } from '@/utils/route';

function StatusBarWeb(): React.ReactNode {
  const colorScheme = useWebColorScheme();

  return <StatusBar style={colorScheme as StatusBarStyle} />;
}

function StatusBarMobile(): React.ReactNode {
  const colorScheme = useColorScheme();

  return <StatusBar style={colorScheme as StatusBarStyle} />;
}

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name={ROUTE_NAMES.index} />
        <Stack.Screen name={ROUTE_NAMES.landing} />
        <Stack.Screen name={ROUTE_NAMES.privacy} />
        <Stack.Screen name={ROUTE_NAMES.terms} />
        <Stack.Screen name={ROUTE_NAMES.contact} />
        <Stack.Screen name={ROUTE_NAMES.notFound} />
      </Stack>
      {isWeb() ? <StatusBarWeb /> : <StatusBarMobile />}
    </>
  );
}
