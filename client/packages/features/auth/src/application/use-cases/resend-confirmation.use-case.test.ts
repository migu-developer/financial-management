import { ResendConfirmationUseCase } from '@features/auth/application/use-cases/resend-confirmation.use-case';
import { createMockAuthRepository } from './__mocks__/auth-repository.mock';

describe('ResendConfirmationUseCase', () => {
  it('normalizes email before calling repository', async () => {
    const repo = createMockAuthRepository();
    repo.resendConfirmationCode.mockResolvedValue(undefined);

    await new ResendConfirmationUseCase(repo).execute('USER@EMAIL.COM');

    expect(repo.resendConfirmationCode).toHaveBeenCalledWith('user@email.com');
  });

  it('propagates repository errors', async () => {
    const repo = createMockAuthRepository();
    repo.resendConfirmationCode.mockRejectedValue(new Error('Limit exceeded'));

    await expect(
      new ResendConfirmationUseCase(repo).execute('user@email.com'),
    ).rejects.toThrow('Limit exceeded');
  });
});
