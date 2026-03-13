import { useRouter } from 'expo-router';

import { LoginPage } from '@features/auth';
import { ROUTES } from '@/utils/route';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <LoginPage
      onForgotPassword={() => router.push(ROUTES.authForgotPassword as never)}
      onSignUp={() => router.push(ROUTES.authRegister as never)}
      onSignInSuccess={() => router.replace(ROUTES.dashboard.home as never)}
      onNewPasswordRequired={() =>
        router.replace(ROUTES.authNewPassword as never)
      }
      onMfaRequired={() => router.replace(ROUTES.authMfa as never)}
      onMfaSetupRequired={() => router.replace(ROUTES.authMfaSetup as never)}
    />
  );
}
