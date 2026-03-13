import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { RegisterPage } from '@features/auth';
import { ROUTES } from '@/utils/route';

export default function RegisterScreen() {
  const router = useRouter();

  const handleRegisterSuccess = useCallback(
    (identifier: string) => {
      router.push({
        pathname: ROUTES.authRegisterConfirm as never,
        params: { identifier },
      });
    },
    [router],
  );

  return (
    <RegisterPage
      onSignIn={() => router.replace(ROUTES.authLogin as never)}
      onRegisterSuccess={handleRegisterSuccess}
      onPressTerms={() => router.push(ROUTES.terms as never)}
      onPressPrivacy={() => router.push(ROUTES.privacy as never)}
    />
  );
}
