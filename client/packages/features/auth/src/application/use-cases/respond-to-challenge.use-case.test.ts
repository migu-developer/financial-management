import {
  RespondToNewPasswordChallengeUseCase,
  RespondToMfaChallengeUseCase,
} from '@features/auth/application/use-cases/respond-to-challenge.use-case';
import { createMockAuthRepository } from './__mocks__/auth-repository.mock';
import { InvalidPasswordException } from '@features/auth/domain/errors/auth-errors';
import type { AuthSession } from '@features/auth/domain/entities/auth-session';
import { AuthChallengeType } from '@features/auth/domain/repositories/auth-repository.port';

const mockSession: AuthSession = {
  accessToken: 'access',
  idToken: 'id',
  refreshToken: 'refresh',
  expiresAt: new Date(Date.now() + 3600_000),
  userId: 'user-1',
};

describe('RespondToNewPasswordChallengeUseCase', () => {
  it('calls repository when new password is valid', async () => {
    const repo = createMockAuthRepository();
    repo.respondToNewPasswordChallenge.mockResolvedValue({
      type: AuthChallengeType.SESSION,
      session: mockSession,
    });

    await new RespondToNewPasswordChallengeUseCase(repo).execute(
      'sess',
      'SecureP@ss1',
    );

    expect(repo.respondToNewPasswordChallenge).toHaveBeenCalledWith(
      'sess',
      'SecureP@ss1',
    );
  });

  it('throws InvalidPasswordException for a weak new password', async () => {
    const repo = createMockAuthRepository();

    await expect(
      new RespondToNewPasswordChallengeUseCase(repo).execute('sess', 'weak'),
    ).rejects.toThrow(InvalidPasswordException);

    expect(repo.respondToNewPasswordChallenge).not.toHaveBeenCalled();
  });
});

describe('RespondToMfaChallengeUseCase', () => {
  it('delegates to repository with all params', async () => {
    const repo = createMockAuthRepository();
    repo.respondToMfaChallenge.mockResolvedValue(mockSession);

    const result = await new RespondToMfaChallengeUseCase(repo).execute(
      'sess',
      '123456',
      'SOFTWARE_TOKEN_MFA',
    );

    expect(repo.respondToMfaChallenge).toHaveBeenCalledWith(
      'sess',
      '123456',
      'SOFTWARE_TOKEN_MFA',
    );
    expect(result).toEqual(mockSession);
  });
});
