import { useCallback, useState } from 'react';
import { createURL } from 'expo-linking';
import { openAuthSessionAsync } from 'expo-web-browser';

import type { SocialProvider } from '@features/auth/domain/repositories/auth-repository.port';
import { useAuth } from '@features/auth/presentation/providers/auth-provider';
import { isWeb } from '@packages/utils/src';

export const OAUTH_STORAGE_KEY = '_oauth_pending';

export interface OAuthPending {
  codeVerifier: string;
  state: string;
  provider: SocialProvider;
  redirectUri: string;
}

export interface UseSocialSignInResult {
  initiate: (provider: SocialProvider) => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Orchestrates the full social OAuth flow with platform-aware strategy:
 *
 * Web:
 *  - Persists PKCE + provider in sessionStorage before opening the browser session.
 *  - Uses openAuthSessionAsync (popup on desktop, in-app browser on mobile web).
 *  - If the popup closes successfully, processes the callback URL in the hook.
 *  - If the session is handled by the /auth/callback route instead (redirect flow),
 *    the sessionStorage entry is consumed there and onSuccess is NOT called here.
 *
 * Native (iOS / Android):
 *  - Uses openAuthSessionAsync with the system browser.
 *  - Processes the deep-link callback URL directly in the hook.
 *
 * Facebook profile picture sync is handled transparently inside
 * AuthProvider.handleOAuthCallback.
 */
export function useSocialSignIn(
  onSuccess: () => void,
  locale?: string,
): UseSocialSignInResult {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiate = useCallback(
    async (provider: SocialProvider) => {
      setLoading(true);
      setError(null);
      try {
        const redirectUri = createURL('auth/callback');
        console.log('[SocialSignIn] Starting', {
          provider,
          redirectUri,
          isWeb: isWeb(),
        });
        const { url, pkce } = await auth.getOAuthSignInUrl(
          provider,
          redirectUri,
        );

        // Persist PKCE so the /auth/callback route can use it in the redirect flow.
        if (isWeb() && typeof sessionStorage !== 'undefined') {
          const pending: OAuthPending = {
            codeVerifier: pkce.codeVerifier,
            state: pkce.state,
            provider,
            redirectUri,
          };
          sessionStorage.setItem(OAUTH_STORAGE_KEY, JSON.stringify(pending));
        }

        console.log('[SocialSignIn] Opening popup', {
          authUrl: url.substring(0, 80) + '...',
          state: pkce.state,
        });
        const result = await openAuthSessionAsync(url, redirectUri);
        console.log('[SocialSignIn] Popup returned', {
          type: result.type,
          url:
            'url' in result
              ? (result as { url: string }).url.substring(0, 120) + '...'
              : 'N/A',
        });

        if (result.type !== 'success') {
          // User cancelled, dismissed, or the callback page consumed the code
          // via the redirect flow — not an error in any of these cases.
          return;
        }

        // Popup flow: the URL was captured before the callback page could process it.
        // Clear sessionStorage so the callback page does not re-process it.
        if (isWeb() && typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(OAUTH_STORAGE_KEY);
        }

        const params = new URL(result.url).searchParams;
        const code = params.get('code');
        const returnedState = params.get('state');

        if (!code) {
          throw new Error('Missing authorization code in callback');
        }
        if (returnedState !== pkce.state) {
          throw new Error('OAuth state mismatch — possible CSRF attempt');
        }

        console.log('[SocialSignIn] Popup flow — exchanging code', {
          provider,
          codePrefix: code.substring(0, 10) + '...',
        });
        await auth.handleOAuthCallback(
          code,
          pkce.codeVerifier,
          redirectUri,
          provider,
          locale,
        );

        console.log('[SocialSignIn] Exchange success — calling onSuccess');
        onSuccess();
      } catch (e) {
        if (isWeb() && typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(OAUTH_STORAGE_KEY);
        }
        const msg = e instanceof Error ? e.message : 'Social sign in failed';
        console.error('[SocialSignIn] Error', {
          provider,
          message: msg,
          error: e,
        });
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [auth, onSuccess, locale],
  );

  return { initiate, loading, error };
}
