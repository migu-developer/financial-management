import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { maybeCompleteAuthSession } from 'expo-web-browser';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@features/auth';
import { useTranslation } from '@packages/i18n';
import type { SocialProvider } from '@features/auth/domain/repositories/auth-repository.port';
import {
  OAUTH_STORAGE_KEY,
  POPUP_STATE_KEY,
  POPUP_RESULT_KEY,
  OAUTH_BROADCAST_CHANNEL,
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
      typeof window !== 'undefined' ? window.location.href : 'N/A';

    // Debug: dump all localStorage keys to understand the storage state
    let lsKeys: string[] = [];
    if (platformIsWeb && typeof localStorage !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) lsKeys.push(key);
        }
      } catch {
        // ignore
      }
    }

    console.log('[Callback] Guard check', {
      platformIsWeb,
      isPopup: popupState !== null,
      popupState,
      mcsResult: mcsResult.type,
      hasOpener: typeof window !== 'undefined' ? window.opener !== null : false,
      href: currentHref,
      code: code ?? null,
      state: state ?? null,
      oauthError: oauthError ?? null,
      localStorageKeys: lsKeys,
    });

    if (popupState) {
      // ── Popup path: send URL back to parent via multiple channels ──────
      console.log(
        '[Callback] Popup detected — sending URL to parent and closing',
        { href: currentHref },
      );

      // Channel 1: BroadcastChannel (primary — not affected by COOP)
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const channel = new BroadcastChannel(OAUTH_BROADCAST_CHANNEL);
          channel.postMessage({
            type: 'oauth_callback_url',
            url: currentHref,
          });
          channel.close();
          console.log('[Callback] Sent URL via BroadcastChannel');
        } catch (e) {
          console.error('[Callback] BroadcastChannel failed', e);
        }
      }

      // Channel 2: localStorage (fallback)
      try {
        localStorage.setItem(POPUP_RESULT_KEY, currentHref);
        console.log('[Callback] Stored URL in localStorage');
      } catch {
        console.error('[Callback] Failed to store result URL in localStorage');
      }

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

    // Facebook appends #_=_ which can move query params into the hash.
    // Try expo-router params first, then fall back to parsing the hash.
    let codeStr = String(code ?? '');
    let stateStr = String(state ?? '');

    if (!codeStr && platformIsWeb && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('code=')) {
        console.log(
          '[Callback] Params not in query string, parsing from hash (Facebook #_=_)',
          { hash: hash.substring(0, 80) },
        );
        const hashParams = new URLSearchParams(hash.replace(/^#[^?]*\??/, ''));
        codeStr = hashParams.get('code') ?? '';
        stateStr = hashParams.get('state') ?? stateStr;
      }
    }

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

    if (stateStr !== pending.state) {
      console.log('[Callback] State mismatch', {
        returnedState: stateStr,
        expectedState: pending.state,
      });
      router.replace(ROUTES.authLogin as never);
      return;
    }

    console.log('[Callback] Redirect flow — exchanging code', {
      provider: pending.provider,
      redirectUri: pending.redirectUri,
      codePrefix: codeStr.substring(0, 10) + '...',
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
