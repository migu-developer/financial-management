/**
 * PKCE utilities for OAuth 2.0 authorization code flow (RFC 7636).
 *
 * Uses expo-crypto instead of the Web Crypto API directly because:
 * - On iOS/Android: expo-crypto calls native CryptoKit / MessageDigest,
 *   which is always available regardless of network context.
 * - On Web: expo-crypto delegates to crypto.subtle (HTTPS or localhost).
 * - crypto.subtle.digest is available in Hermes ≥ 0.73 (RN 0.73+) but
 *   expo-crypto is the Expo-idiomatic abstraction and removes that constraint.
 */
import {
  CryptoDigestAlgorithm,
  CryptoEncoding,
  digestStringAsync,
  getRandomBytes,
} from 'expo-crypto';

import type { PkceParams } from '@features/auth/domain/repositories/auth-repository.port';

/**
 * Converts a Uint8Array of random bytes to a base64url-encoded string.
 * 96 bytes → 128-char base64url (no padding), satisfying RFC 7636 §4.1.
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generates PKCE parameters:
 * - codeVerifier: 128-char base64url random string (RFC 7636 §4.1)
 * - codeChallenge: S256 hash of the verifier (RFC 7636 §4.2)
 * - state: 32-char base64url random string for CSRF protection
 */
export async function generatePkce(): Promise<PkceParams> {
  const codeVerifier = bytesToBase64Url(getRandomBytes(96));

  const [codeChallenge, state] = await Promise.all([
    digestStringAsync(CryptoDigestAlgorithm.SHA256, codeVerifier, {
      encoding: CryptoEncoding.BASE64,
    }).then((b64) =>
      b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
    ),
    Promise.resolve(bytesToBase64Url(getRandomBytes(24))),
  ]);

  return { codeVerifier, codeChallenge, state };
}
