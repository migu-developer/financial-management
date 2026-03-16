import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { maybeCompleteAuthSession } from 'expo-web-browser';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@features/auth';
import { useTranslation } from '@packages/i18n';
import type { SocialProvider } from '@features/auth/domain/repositories/auth-repository.port';
import {
  OAUTH_STORAGE_KEY,
  type OAuthPending,
} from '@features/auth/presentation/hooks/use-social-sign-in';
import { ROUTES } from '@/utils/route';
import { isWeb } from '@packages/utils/src';

// Must be called at module level — tells expo-web-browser to close the popup
// and send the URL back to the opener window via postMessage.
maybeCompleteAuthSession();

type Status = 'processing' | 'success' | 'error';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { handleOAuthCallback } = useAuth();
  const { t } = useTranslation('login');
  const {
    code,
    state,
    error: oauthError,
  } = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
  const [status, setStatus] = useState<Status>('processing');

  const platformIsWeb = useMemo(() => isWeb(), []);

  useEffect(() => {
    const codeStr = String(code ?? '');

    // OAuth error returned by the provider (e.g. user denied access)
    if (oauthError || !codeStr) {
      router.replace(ROUTES.authLogin as never);
      return;
    }

    // Redirect flow (direct navigation or native deep link without the hook being active).
    // Read PKCE stored by useSocialSignIn before it triggered the navigation.
    let pending: OAuthPending | null = null;
    if (platformIsWeb && typeof sessionStorage !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(OAUTH_STORAGE_KEY);
        if (stored) {
          pending = JSON.parse(stored) as OAuthPending;
          sessionStorage.removeItem(OAUTH_STORAGE_KEY);
        }
      } catch {
        // sessionStorage unavailable
      }
    }

    if (!pending) {
      router.replace(ROUTES.authLogin as never);
      return;
    }

    const returnedState = String(state ?? '');
    if (returnedState !== pending.state) {
      router.replace(ROUTES.authLogin as never);
      return;
    }

    handleOAuthCallback(
      codeStr,
      pending.codeVerifier,
      pending.redirectUri,
      pending.provider as SocialProvider,
    )
      .then(() => {
        setStatus('success');
        // Brief success state so the user sees the confirmation before navigating.
        setTimeout(() => {
          router.replace(ROUTES.dashboard.home as never);
        }, 600);
      })
      .catch(() => {
        setStatus('error');
        setTimeout(() => {
          router.replace(ROUTES.authLogin as never);
        }, 1200);
      });
  }, [code, state, oauthError, router, handleOAuthCallback, platformIsWeb]);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-slate-50 dark:bg-slate-900">
      {status === 'processing' && (
        <ActivityIndicator size="large" className="text-primary-400" />
      )}
      {status === 'success' && (
        <>
          <Text className="text-2xl">✓</Text>
          <Text className="text-slate-700 dark:text-slate-200 text-base">
            {t('callback.signInSuccess')}
          </Text>
        </>
      )}
      {status === 'error' && (
        <Text className="text-red-500 text-base">
          {t('callback.signInFailed')}
        </Text>
      )}
    </View>
  );
}
