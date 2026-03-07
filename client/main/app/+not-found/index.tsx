import { Stack, useRouter } from 'expo-router';

import { NotFoundPage } from '@features/landing';
import { ROUTE_NAMES, ROUTES } from '@/utils/route';

export default function NotFound() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        name={ROUTE_NAMES.notFound}
        options={{ headerShown: false }}
      />
      <NotFoundPage
        onGoHomePress={() => router.replace(ROUTES.landing as never)}
      />
    </>
  );
}
