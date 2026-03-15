import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@features/auth';
import { ROUTES } from '@/utils/route';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { code = '' } = useLocalSearchParams<{
    code: string;
    state: string;
  }>();
  const { handleOAuthCallback } = useAuth();

  useEffect(() => {
    const oauthCode = String(code);
    if (!oauthCode) {
      router.replace(ROUTES.authLogin as never);
      return;
    }

    // codeVerifier is stored during OAuth initiation (Fase 7 — social)
    // For now, redirect to login if no verifier is available
    router.replace(ROUTES.authLogin as never);
  }, [code, router, handleOAuthCallback]);

  return (
    <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
      <ActivityIndicator size="large" />
    </View>
  );
}
