import { useCallback, useState } from 'react';
import { createURL } from 'expo-linking';
import { openAuthSessionAsync } from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SocialProvider } from '@features/auth/domain/repositories/auth-repository.port';
import { useAuth } from '@features/auth/presentation/providers/auth-provider';
import { isWeb } from '@packages/utils/src';

export const OAUTH_STORAGE_KEY = '_oauth_pending';

// localStorage keys shared between the parent window and the popup callback page.
// Used as a bridge when COOP headers sever window.opener and prevent postMessage.
export const POPUP_STATE_KEY = '_oauth_popup_state';
export const POPUP_RESULT_KEY = '_oauth_popup_result';

// BroadcastChannel name for cross-window communication.
// BroadcastChannel is NOT affected by COOP — it works between any same-origin
// windows/tabs regardless of browsing context group.
export const OAUTH_BROADCAST_CHANNEL = '_oauth_popup_bridge';

export interface OAuthPending {
  codeVerifier: string;
  state: string;
  provider: SocialProvider;
  redirectUri: string;
}

/**
 * Read and consume the pending OAuth PKCE data from AsyncStorage.
 * Used by the callback page in the redirect flow.
 */
export async function consumePendingOAuth(): Promise<OAuthPending | null> {
  try {
    const stored = await AsyncStorage.getItem(OAUTH_STORAGE_KEY);
    if (!stored) return null;
    await AsyncStorage.removeItem(OAUTH_STORAGE_KEY);
    return JSON.parse(stored) as OAuthPending;
  } catch {
    return null;
  }
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
 * When COOP headers cause openAuthSessionAsync to resolve immediately (the popup
 * appears "closed" to the parent), the user is still completing the OAuth flow in
 * the popup. We poll BroadcastChannel and localStorage until the popup sends
 * back the callback URL. The timeout is intentionally very high (10 min) — it
 * exists only to prevent a truly infinite loop; in practice OAuth completes in
 * seconds and the poll resolves immediately.
 */
const COOP_POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const COOP_POLL_INTERVAL_MS = 400;

async function pollForCallbackUrl(
  getBroadcastUrl: () => string | null,
  storageKey: string,
): Promise<string | null> {
  const deadline = Date.now() + COOP_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const bUrl = getBroadcastUrl();
    if (bUrl) return bUrl;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return stored;
    } catch {
      // localStorage unavailable
    }
    await new Promise((r) => setTimeout(r, COOP_POLL_INTERVAL_MS));
  }
  return null;
}

/**
 * Orchestrates the full social OAuth flow with platform-aware strategy:
 *
 * Web:
 *  - Persists PKCE + provider in sessionStorage before opening the browser session.
 *  - Uses openAuthSessionAsync (popup on desktop, in-app browser on mobile web).
 *  - If the popup closes successfully, processes the callback URL in the hook.
 *  - If COOP headers prevent postMessage (production), uses BroadcastChannel
 *    (primary) or localStorage (fallback) to receive the callback URL from the popup.
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

      // BroadcastChannel listener — set up before opening popup so we don't
      // miss the message.  Captured URL is read after openAuthSessionAsync resolves.
      let broadcastUrl: string | null = null;
      let channel: BroadcastChannel | null = null;
      if (isWeb() && typeof BroadcastChannel !== 'undefined') {
        try {
          channel = new BroadcastChannel(OAUTH_BROADCAST_CHANNEL);
          channel.onmessage = (e: MessageEvent) => {
            if (e.data?.type === 'oauth_callback_url' && e.data?.url) {
              broadcastUrl = e.data.url as string;
            }
          };
        } catch {
          // BroadcastChannel not available
        }
      }

      try {
        const redirectUri = createURL('auth/callback');
        const { url, pkce } = await auth.getOAuthSignInUrl(
          provider,
          redirectUri,
        );

        // Persist PKCE so the /auth/callback route can use it in the redirect flow.
        const pending: OAuthPending = {
          codeVerifier: pkce.codeVerifier,
          state: pkce.state,
          provider,
          redirectUri,
        };
        await AsyncStorage.setItem(OAUTH_STORAGE_KEY, JSON.stringify(pending));

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

        const result = await openAuthSessionAsync(url, redirectUri);

        // ── Determine the callback URL ────────────────────────────────────────
        // Three possible sources (in priority order):
        //  1. openAuthSessionAsync returned 'success' (postMessage worked)
        //  2. BroadcastChannel message from the popup (not affected by COOP)
        //  3. localStorage entry written by the popup (fallback)
        let callbackUrl: string | null = null;

        if (result.type === 'success') {
          callbackUrl = result.url;
        } else {
          // COOP headers from Cognito may sever the popup connection, causing
          // openAuthSessionAsync to resolve immediately as "dismiss" before the
          // user completed the OAuth flow. The popup marker (localStorage) MUST
          // stay alive so the callback page can detect it's a popup. Poll for
          // the callback URL via BroadcastChannel / localStorage until the popup
          // sends it back or we time out.
          if (isWeb()) {
            callbackUrl = await pollForCallbackUrl(
              () => broadcastUrl,
              POPUP_RESULT_KEY,
            );
          }
        }

        // Clean up communication channels
        try {
          channel?.close();
        } catch {}
        channel = null;
        cleanupPopupStorage();

        if (!callbackUrl) {
          return;
        }

        // Clear PKCE since we're handling the code exchange here.
        await AsyncStorage.removeItem(OAUTH_STORAGE_KEY).catch(() => {});

        // Facebook appends #_=_ which moves query params into the hash fragment.
        const cleanUrl = sanitizeOAuthUrl(callbackUrl);
        const params = new URL(cleanUrl).searchParams;
        const code = params.get('code');
        const returnedState = params.get('state');

        if (!code) {
          throw new Error('Missing authorization code in callback');
        }
        if (returnedState !== pkce.state) {
          throw new Error('OAuth state mismatch — possible CSRF attempt');
        }

        await auth.handleOAuthCallback(
          code,
          pkce.codeVerifier,
          redirectUri,
          provider,
          locale,
        );

        onSuccess();
      } catch (e) {
        cleanupPopupStorage();
        if (isWeb() && typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(OAUTH_STORAGE_KEY);
        }
        const msg = e instanceof Error ? e.message : 'Social sign in failed';
        setError(msg);
      } finally {
        try {
          channel?.close();
        } catch {}
        setLoading(false);
      }
    },
    [auth, onSuccess, locale],
  );

  return { initiate, loading, error };
}
