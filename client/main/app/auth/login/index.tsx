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
      onNewPasswordRequired={() => router.push(ROUTES.authNewPassword as never)}
      onMfaRequired={() => router.push(ROUTES.authMfa as never)}
      onMfaSetupRequired={() => router.push(ROUTES.authMfaSetup as never)}
    />
  );
}
