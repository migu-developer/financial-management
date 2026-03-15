import { InitiateSocialSignInUseCase } from '@features/auth/application/use-cases/initiate-social-sign-in.use-case';
import { createMockAuthRepository } from './__mocks__/auth-repository.mock';
import type { SocialProvider } from '@features/auth/domain/repositories/auth-repository.port';

const providers: SocialProvider[] = [
  'google',
  'facebook',
  'apple',
  'microsoft',
];

describe('InitiateSocialSignInUseCase', () => {
  test.each(providers)(
    'returns url and pkce for %s provider',
    async (provider) => {
      const repo = createMockAuthRepository();
      repo.getOAuthSignInUrl.mockResolvedValue({
        url: `https://auth.example.com/oauth2/authorize?identity_provider=${provider}`,
        pkce: {
          codeVerifier: 'verifier',
          codeChallenge: 'challenge',
          state: 'state123',
        },
      });

      const result = await new InitiateSocialSignInUseCase(repo).execute(
        provider,
        'com.migudev.app://auth/callback',
      );

      expect(repo.getOAuthSignInUrl).toHaveBeenCalledWith(
        provider,
        'com.migudev.app://auth/callback',
      );
      expect(result.url).toContain(provider);
      expect(result.pkce.codeVerifier).toBe('verifier');
    },
  );
});
