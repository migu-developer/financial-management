import { Stack, useRouter } from 'expo-router';

import { ContactPage } from '@features/landing';
import { ROUTE_NAMES } from '@/utils/route';

export default function ContactScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        name={ROUTE_NAMES.contact}
        options={{ headerShown: false }}
      />
      <ContactPage onBackPress={() => router.back()} />
    </>
  );
}
