import { useRouter } from 'expo-router';

import { LandingPage } from '@features/landing';
import { ROUTES } from '@/utils/route';

export default function LandingScreen() {
  const router = useRouter();

  return (
    <LandingPage onNavigateToAuth={() => router.push(ROUTES.auth as never)} />
  );
}
