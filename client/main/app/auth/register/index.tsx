import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';

import { RegisterPage } from '@features/auth';
import { ROUTES } from '@/utils/route';

const APP_URL = process.env.EXPO_PUBLIC_APPLICATION_URL ?? '';

export default function RegisterScreen() {
  const router = useRouter();

  const handleRegisterSuccess = useCallback(
    (identifier: string, phone: string) => {
      router.replace({
        pathname: ROUTES.authRegisterConfirm as never,
        params: { identifier, phone },
      });
    },
    [router],
  );

  return (
    <RegisterPage
      onSignIn={() => router.replace(ROUTES.authLogin as never)}
      onRegisterSuccess={handleRegisterSuccess}
      onPressTerms={() => void Linking.openURL(`${APP_URL}/terms`)}
      onPressPrivacy={() => void Linking.openURL(`${APP_URL}/privacy`)}
    />
  );
}
