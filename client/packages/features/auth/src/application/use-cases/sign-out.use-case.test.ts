import { SignOutUseCase } from '@features/auth/application/use-cases/sign-out.use-case';
import { createMockAuthRepository } from './__mocks__/auth-repository.mock';

describe('SignOutUseCase', () => {
  it('delegates signOut to repository', async () => {
    const repo = createMockAuthRepository();
    repo.signOut.mockResolvedValue(undefined);

    await new SignOutUseCase(repo).execute();

    expect(repo.signOut).toHaveBeenCalledTimes(1);
  });

  it('propagates repository errors', async () => {
    const repo = createMockAuthRepository();
    repo.signOut.mockRejectedValue(new Error('Network error'));

    await expect(new SignOutUseCase(repo).execute()).rejects.toThrow(
      'Network error',
    );
  });
});
