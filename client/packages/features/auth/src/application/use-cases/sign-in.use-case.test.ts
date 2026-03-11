import { SignInUseCase } from '@features/auth/application/use-cases/sign-in.use-case';
import { createMockAuthRepository } from './__mocks__/auth-repository.mock';
import {
  AuthChallengeType,
  type AuthChallengeResult,
} from '@features/auth/domain/repositories/auth-repository.port';
import type { AuthSession } from '@features/auth/domain/entities/auth-session';

const mockSession: AuthSession = {
  accessToken: 'access',
  idToken: 'id',
  refreshToken: 'refresh',
  expiresAt: new Date(Date.now() + 3600_000),
  userId: 'user-1',
};

const sessionResult: AuthChallengeResult = {
  type: AuthChallengeType.SESSION,
  session: mockSession,
};

describe('SignInUseCase', () => {
  it('normalizes email to lowercase before calling repository', async () => {
    const repo = createMockAuthRepository();
    repo.signIn.mockResolvedValue(sessionResult);

    await new SignInUseCase(repo).execute('USER@EMAIL.COM', 'pass');

    expect(repo.signIn).toHaveBeenCalledWith('user@email.com', 'pass');
  });

  it('passes phone number trimmed to repository', async () => {
    const repo = createMockAuthRepository();
    repo.signIn.mockResolvedValue(sessionResult);

    await new SignInUseCase(repo).execute('  +573001234567  ', 'pass');

    expect(repo.signIn).toHaveBeenCalledWith('+573001234567', 'pass');
  });

  it('returns the challenge result from repository', async () => {
    const repo = createMockAuthRepository();
    const mfaResult: AuthChallengeResult = {
      type: AuthChallengeType.SOFTWARE_TOKEN_MFA,
      session: 'sess',
    };
    repo.signIn.mockResolvedValue(mfaResult);

    const result = await new SignInUseCase(repo).execute(
      'user@email.com',
      'pass',
    );

    expect(result).toEqual(mfaResult);
  });

  it('propagates repository errors', async () => {
    const repo = createMockAuthRepository();
    repo.signIn.mockRejectedValue(new Error('Auth failed'));

    await expect(
      new SignInUseCase(repo).execute('user@email.com', 'pass'),
    ).rejects.toThrow('Auth failed');
  });
});
