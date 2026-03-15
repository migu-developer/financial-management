import { useRouter } from 'expo-router';

import { MfaVerifyPage } from '@features/auth';
import { ROUTES } from '@/utils/route';

export default function MfaScreen() {
  const router = useRouter();

  return (
    <MfaVerifyPage
      onVerifySuccess={() => router.replace(ROUTES.dashboard.home as never)}
      onBack={() => router.replace(ROUTES.authLogin as never)}
    />
  );
}
