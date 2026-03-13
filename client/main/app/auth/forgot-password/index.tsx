import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import { ForgotPasswordPage } from '@features/auth';
import { ROUTES } from '@/utils/route';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const handleSubmitSuccess = useCallback(
    (destination: string, medium: string, identifier: string) => {
      router.push({
        pathname: ROUTES.authForgotPasswordConfirm as never,
        params: { destination, medium, identifier },
      });
    },
    [router],
  );

  return (
    <ForgotPasswordPage
      onBack={() => router.replace(ROUTES.authLogin as never)}
      onSubmitSuccess={handleSubmitSuccess}
    />
  );
}
