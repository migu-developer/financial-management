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
// skipRedirectCheck avoids failures when the server adds a trailing slash
// (e.g. /auth/callback → /auth/callback/) which breaks the default URL comparison.
const mcsResult = maybeCompleteAuthSession({ skipRedirectCheck: true });
console.log('[Callback] maybeCompleteAuthSession result', mcsResult);

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
    // ── Popup guard ─────────────────────────────────────────────────────────
    // When this page runs inside a popup opened by openAuthSessionAsync,
    // maybeCompleteAuthSession() (module-level) already stored the URL in
    // localStorage for the parent to read.  The parent's hook will extract the
    // code and call handleOAuthCallback.
    //
    // We must NOT also process the code here — Cognito authorization codes are
    // single-use, so two concurrent exchanges cause one to fail.
    //
    // We detect the popup via expo-web-browser's localStorage handle rather than
    // window.opener, because Cross-Origin-Opener-Policy (COOP) headers from
    // Cognito's hosted UI sever window.opener after cross-origin navigation.
    const redirectHandle = (() => {
      if (!platformIsWeb || typeof localStorage === 'undefined') return null;
      try {
        return localStorage.getItem('ExpoWebBrowserRedirectHandle');
      } catch {
        return null;
      }
    })();
    const isPopup = redirectHandle !== null;

    console.log('[Callback] Guard check', {
      platformIsWeb,
      isPopup,
      redirectHandle,
      hasOpener: typeof window !== 'undefined' ? window.opener !== null : false,
      href: typeof window !== 'undefined' ? window.location.href : 'N/A',
      code: code ?? null,
      state: state ?? null,
      oauthError: oauthError ?? null,
    });

    if (isPopup) {
      console.log(
        '[Callback] Popup detected — closing window, parent will handle the code',
      );
      try {
        window.close();
      } catch {
        console.log('[Callback] window.close() blocked by browser');
      }
      return;
    }

    // ── Redirect flow ───────────────────────────────────────────────────────
    // This path runs when the page was navigated to directly (full redirect,
    // not a popup).  Read the PKCE data that useSocialSignIn persisted in
    // sessionStorage before triggering the OAuth redirect.

    const codeStr = String(code ?? '');

    // OAuth error returned by the provider (e.g. user denied access)
    if (oauthError || !codeStr) {
      console.log('[Callback] No code or OAuth error — redirecting to login', {
        oauthError,
        codeStr,
      });
      router.replace(ROUTES.authLogin as never);
      return;
    }

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
      console.log(
        '[Callback] No pending PKCE in sessionStorage — redirecting to login',
      );
      router.replace(ROUTES.authLogin as never);
      return;
    }

    const returnedState = String(state ?? '');
    if (returnedState !== pending.state) {
      console.log('[Callback] State mismatch', {
        returnedState,
        expectedState: pending.state,
      });
      router.replace(ROUTES.authLogin as never);
      return;
    }

    console.log('[Callback] Redirect flow — exchanging code', {
      provider: pending.provider,
      redirectUri: pending.redirectUri,
    });
    handleOAuthCallback(
      codeStr,
      pending.codeVerifier,
      pending.redirectUri,
      pending.provider as SocialProvider,
    )
      .then(() => {
        console.log('[Callback] Exchange success — navigating to dashboard');
        setStatus('success');
        setTimeout(() => {
          router.replace(ROUTES.dashboard.home as never);
        }, 600);
      })
      .catch((err) => {
        console.error('[Callback] Exchange failed', err);
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
