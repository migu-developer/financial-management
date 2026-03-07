import { Stack, useRouter } from 'expo-router';

import { TermsPage } from '@features/landing';
import { ROUTE_NAMES } from '@/utils/route';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen name={ROUTE_NAMES.terms} options={{ headerShown: false }} />
      <TermsPage onBackPress={() => router.back()} />
    </>
  );
}
