import { useRouter } from 'expo-router';

import { NewPasswordPage } from '@features/auth';
import { ROUTES } from '@/utils/route';

export default function NewPasswordScreen() {
  const router = useRouter();

  return (
    <NewPasswordPage
      onSignInSuccess={() => router.replace(ROUTES.dashboard.home as never)}
      onMfaRequired={() => router.replace(ROUTES.authMfa as never)}
      onMfaSetupRequired={() => router.replace(ROUTES.authMfaSetup as never)}
      onBack={() => router.replace(ROUTES.authLogin as never)}
    />
  );
}
