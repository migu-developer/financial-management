import { HandleOAuthCallbackUseCase } from '@features/auth/application/use-cases/handle-oauth-callback.use-case';
import { createMockAuthRepository } from './__mocks__/auth-repository.mock';
import type { AuthSession } from '@features/auth/domain/entities/auth-session';

const mockSession: AuthSession = {
  accessToken: 'access',
  idToken: 'id',
  refreshToken: 'refresh',
  expiresAt: new Date(Date.now() + 3600_000),
  userId: 'user-1',
};

describe('HandleOAuthCallbackUseCase', () => {
  it('exchanges code for session via repository', async () => {
    const repo = createMockAuthRepository();
    repo.handleOAuthCallback.mockResolvedValue(mockSession);

    const result = await new HandleOAuthCallbackUseCase(repo).execute(
      'auth-code-123',
      'code-verifier-abc',
      'com.migudev.app://auth/callback',
    );

    expect(repo.handleOAuthCallback).toHaveBeenCalledWith(
      'auth-code-123',
      'code-verifier-abc',
      'com.migudev.app://auth/callback',
    );
    expect(result).toEqual(mockSession);
  });

  it('propagates repository errors', async () => {
    const repo = createMockAuthRepository();
    repo.handleOAuthCallback.mockRejectedValue(new Error('Invalid code'));

    await expect(
      new HandleOAuthCallbackUseCase(repo).execute(
        'bad-code',
        'verifier',
        'uri',
      ),
    ).rejects.toThrow('Invalid code');
  });
});
