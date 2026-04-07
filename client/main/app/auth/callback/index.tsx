import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@features/auth';
import { useTranslation } from '@packages/i18n';
import type { SocialProvider } from '@features/auth/domain/repositories/auth-repository.port';
import {
  POPUP_STATE_KEY,
  POPUP_RESULT_KEY,
  OAUTH_BROADCAST_CHANNEL,
  consumePendingOAuth,
} from '@features/auth/presentation/hooks/use-social-sign-in';
import { ROUTES } from '@/utils/route';
import { isWeb } from '@packages/utils/src';

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
    // Detect if this page is running inside a popup opened by useSocialSignIn.
    //
    // We use our own localStorage marker (_oauth_popup_state) set by the
    // parent before opening the popup. This is reliable even when:
    //  - COOP headers sever window.opener (production Cognito)
    //  - expo-web-browser's internal handle isn't shared across windows
    //
    // When detected as popup:
    //  1. maybeCompleteAuthSession (module-level) already tried postMessage
    //  2. We send the URL via BroadcastChannel (primary, not affected by COOP)
    //  3. We also store it in localStorage (fallback)
    //  4. The parent reads from whichever channel delivers first
    const popupState = (() => {
      if (!platformIsWeb || typeof localStorage === 'undefined') return null;
      try {
        return localStorage.getItem(POPUP_STATE_KEY);
      } catch {
        return null;
      }
    })();

    const currentHref =
      typeof window !== 'undefined' ? window.location.href : '';

    if (popupState) {
      // ── Popup path: send URL back to parent via multiple channels ──────

      // Channel 1: BroadcastChannel (primary — not affected by COOP)
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const channel = new BroadcastChannel(OAUTH_BROADCAST_CHANNEL);
          channel.postMessage({
            type: 'oauth_callback_url',
            url: currentHref,
          });
          channel.close();
        } catch {
          // BroadcastChannel not available
        }
      }

      // Channel 2: localStorage (fallback)
      try {
        localStorage.setItem(POPUP_RESULT_KEY, currentHref);
      } catch {
        // localStorage unavailable
      }

      try {
        window.close();
      } catch {
        // window.close() blocked by browser
      }
      return;
    }

    // ── Redirect flow ───────────────────────────────────────────────────────
    // This path runs when the page was navigated to directly (full redirect,
    // not a popup).  consumePendingOAuth() reads the PKCE data that
    // useSocialSignIn persisted in AsyncStorage before the OAuth redirect.

    // Facebook appends #_=_ which can move query params into the hash.
    // Try expo-router params first, then fall back to parsing the hash.
    let codeStr = String(code ?? '');
    let stateStr = String(state ?? '');

    if (!codeStr && platformIsWeb && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('code=')) {
        const hashParams = new URLSearchParams(hash.replace(/^#[^?]*\??/, ''));
        codeStr = hashParams.get('code') ?? '';
        stateStr = hashParams.get('state') ?? stateStr;
      }
    }

    // OAuth error returned by the provider (e.g. user denied access)
    if (oauthError || !codeStr) {
      router.replace(ROUTES.authLogin as never);
      return;
    }

    async function processRedirectFlow() {
      const pending = await consumePendingOAuth();

      if (!pending) {
        router.replace(ROUTES.authLogin as never);
        return;
      }

      if (stateStr !== pending.state) {
        router.replace(ROUTES.authLogin as never);
        return;
      }

      try {
        await handleOAuthCallback(
          codeStr,
          pending.codeVerifier,
          pending.redirectUri,
          pending.provider as SocialProvider,
        );
        setStatus('success');
        setTimeout(() => {
          router.replace(ROUTES.dashboard.home as never);
        }, 600);
      } catch {
        setStatus('error');
        setTimeout(() => {
          router.replace(ROUTES.authLogin as never);
        }, 1200);
      }
    }

    processRedirectFlow();
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
