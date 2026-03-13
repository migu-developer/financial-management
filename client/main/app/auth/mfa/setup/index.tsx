import { useRouter } from 'expo-router';

import { MfaSetupPage } from '@features/auth';
import { ROUTES } from '@/utils/route';

export default function MfaSetupScreen() {
  const router = useRouter();

  return (
    <MfaSetupPage
      onSetupSuccess={() => router.replace(ROUTES.dashboard.home as never)}
      onSkip={() => router.replace(ROUTES.dashboard.home as never)}
    />
  );
}
