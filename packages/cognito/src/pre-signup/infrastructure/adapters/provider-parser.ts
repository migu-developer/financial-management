/**
 * Extracts provider name and user ID from the Cognito userName.
 *
 * For external providers, userName format is: ProviderName_ProviderUserId
 * Examples:
 *   "Google_106895571745093657038" → { name: "Google", userId: "106895571745093657038" }
 *   "Facebook_987654321"          → { name: "Facebook", userId: "987654321" }
 *   "SignInWithApple_000123.abc"  → { name: "SignInWithApple", userId: "000123.abc" }
 *   "Microsoft_abc-def-123"      → { name: "Microsoft", userId: "abc-def-123" }
 *
 * For native Cognito users, returns null (no provider prefix).
 */
export function parseExternalProvider(
  userName: string,
): { name: string; userId: string } | null {
  const providers = ['Google', 'Facebook', 'SignInWithApple', 'Microsoft'];

  for (const provider of providers) {
    const prefix = `${provider}_`;
    if (userName.startsWith(prefix)) {
      return {
        name: provider,
        userId: userName.slice(prefix.length),
      };
    }
  }

  return null;
}
