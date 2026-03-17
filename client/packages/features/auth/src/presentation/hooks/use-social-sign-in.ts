import { useCallback, useState } from 'react';
import { createURL } from 'expo-linking';
import { openAuthSessionAsync } from 'expo-web-browser';

import type { SocialProvider } from '@features/auth/domain/repositories/auth-repository.port';
import { useAuth } from '@features/auth/presentation/providers/auth-provider';
import { isWeb } from '@packages/utils/src';

export const OAUTH_STORAGE_KEY = '_oauth_pending';

// localStorage keys shared between the parent window and the popup callback page.
// Used as a bridge when COOP headers sever window.opener and prevent postMessage.
export const POPUP_STATE_KEY = '_oauth_popup_state';
export const POPUP_RESULT_KEY = '_oauth_popup_result';

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
 * Facebook appends `#_=_` to redirect URLs, which moves query params into the
 * hash fragment (e.g. `callback#_=_?code=xxx`). This breaks `new URL().searchParams`.
 */
function sanitizeOAuthUrl(url: string): string {
  return url.replace('#_=_', '');
}

function cleanupPopupStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(POPUP_STATE_KEY);
    localStorage.removeItem(POPUP_RESULT_KEY);
  } catch {
    // localStorage unavailable
  }
}

/**
 * Orchestrates the full social OAuth flow with platform-aware strategy:
 *
 * Web:
 *  - Persists PKCE + provider in sessionStorage before opening the browser session.
 *  - Uses openAuthSessionAsync (popup on desktop, in-app browser on mobile web).
 *  - If the popup closes successfully, processes the callback URL in the hook.
 *  - If COOP headers prevent postMessage (production), reads the callback URL
 *    from localStorage where the popup callback page stored it.
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

        // Store a marker in localStorage (shared between windows) so the popup
        // callback page can detect it was opened by us — even when COOP headers
        // from Cognito sever window.opener and break maybeCompleteAuthSession.
        if (isWeb() && typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(POPUP_STATE_KEY, pkce.state);
          } catch {
            // localStorage unavailable
          }
        }

        console.log('[SocialSignIn] Opening popup', {
          authUrl: url.substring(0, 80) + '...',
          state: pkce.state,
        });
        const result = await openAuthSessionAsync(url, redirectUri);

        // ── Determine the callback URL ────────────────────────────────────────
        // Two possible sources:
        //  1. openAuthSessionAsync returned 'success' with the URL (postMessage worked)
        //  2. openAuthSessionAsync returned 'dismiss' but the popup stored the URL
        //     in localStorage before closing (COOP fallback)
        let callbackUrl: string | null = null;

        if (result.type === 'success') {
          callbackUrl = result.url;
          console.log('[SocialSignIn] Popup returned success', {
            url: callbackUrl.substring(0, 120) + '...',
          });
        } else {
          console.log('[SocialSignIn] Popup returned', { type: result.type });

          // COOP fallback: the popup may have stored the callback URL in
          // localStorage just before closing. Give a tiny buffer for the write
          // to propagate (localStorage.setItem is sync, but the popup close
          // event may race with our read).
          if (isWeb() && typeof localStorage !== 'undefined') {
            await new Promise((r) => setTimeout(r, 200));
            try {
              const storedUrl = localStorage.getItem(POPUP_RESULT_KEY);
              if (storedUrl) {
                callbackUrl = storedUrl;
                console.log(
                  '[SocialSignIn] Recovered URL from localStorage (COOP fallback)',
                  { url: storedUrl.substring(0, 120) + '...' },
                );
              }
            } catch {
              // localStorage unavailable
            }
          }
        }

        cleanupPopupStorage();

        if (!callbackUrl) {
          // User cancelled, dismissed without completing auth, or callback
          // page consumed the code via the redirect flow.
          console.log('[SocialSignIn] No callback URL — user likely cancelled');
          return;
        }

        // Clear sessionStorage PKCE since we're handling the code exchange here.
        if (isWeb() && typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(OAUTH_STORAGE_KEY);
        }

        // Facebook appends #_=_ which moves query params into the hash fragment.
        const cleanUrl = sanitizeOAuthUrl(callbackUrl);
        const params = new URL(cleanUrl).searchParams;
        const code = params.get('code');
        const returnedState = params.get('state');

        console.log('[SocialSignIn] Parsed callback URL', {
          hasCode: !!code,
          stateMatch: returnedState === pkce.state,
          hadHashFragment: callbackUrl !== cleanUrl,
        });

        if (!code) {
          throw new Error('Missing authorization code in callback');
        }
        if (returnedState !== pkce.state) {
          throw new Error('OAuth state mismatch — possible CSRF attempt');
        }

        console.log('[SocialSignIn] Exchanging code with PKCE', {
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
        cleanupPopupStorage();
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
