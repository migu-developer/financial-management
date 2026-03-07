import { Stack, useRouter } from 'expo-router';

import { LandingPage } from '@features/landing';
import { ROUTE_NAMES, ROUTES } from '@/utils/route';

export default function LandingScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        name={ROUTE_NAMES.landing}
        options={{ headerShown: false }}
      />
      <LandingPage
        onNavigateToAuth={() => router.push(ROUTES.auth as never)}
        onNavigateToPrivacy={() => router.push(ROUTES.privacy as never)}
        onNavigateToTerms={() => router.push(ROUTES.terms as never)}
        onNavigateToContact={() => router.push(ROUTES.contact as never)}
      />
    </>
  );
}
