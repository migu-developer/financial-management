import type { PkceParams } from '@features/auth/domain/repositories/auth-repository.port';

/**
 * Generates a cryptographically random base64url-encoded string.
 * 96 random bytes → 128-char base64url string (RFC 7636 max length).
 */
function randomBase64Url(byteCount: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteCount));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * SHA-256 hash of input, returned as base64url (RFC 7636 §4.2).
 */
async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generates PKCE parameters for OAuth 2.0 authorization code flow (RFC 7636).
 * - codeVerifier: 128-char base64url random string
 * - codeChallenge: S256 hash of the verifier
 * - state: 32-char base64url random string for CSRF protection
 */
export async function generatePkce(): Promise<PkceParams> {
  const codeVerifier = randomBase64Url(96);
  const [codeChallenge, state] = await Promise.all([
    sha256Base64Url(codeVerifier),
    Promise.resolve(randomBase64Url(24)),
  ]);
  return { codeVerifier, codeChallenge, state };
}
