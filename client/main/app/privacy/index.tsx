import { Stack, useRouter } from 'expo-router';

import { PrivacyPage } from '@features/landing';
import { ROUTE_NAMES } from '@/utils/route';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        name={ROUTE_NAMES.privacy}
        options={{ headerShown: false }}
      />
      <PrivacyPage onBackPress={() => router.back()} />
    </>
  );
}
