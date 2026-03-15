import { ConfirmSignUpUseCase } from '@features/auth/application/use-cases/confirm-sign-up.use-case';
import { createMockAuthRepository } from './__mocks__/auth-repository.mock';

describe('ConfirmSignUpUseCase', () => {
  it('normalizes email before calling repository', async () => {
    const repo = createMockAuthRepository();
    repo.confirmSignUp.mockResolvedValue(undefined);

    await new ConfirmSignUpUseCase(repo).execute('USER@EMAIL.COM', '123456');

    expect(repo.confirmSignUp).toHaveBeenCalledWith('user@email.com', '123456');
  });

  it('passes phone trimmed to repository', async () => {
    const repo = createMockAuthRepository();
    repo.confirmSignUp.mockResolvedValue(undefined);

    await new ConfirmSignUpUseCase(repo).execute('  +573001234567  ', '123456');

    expect(repo.confirmSignUp).toHaveBeenCalledWith('+573001234567', '123456');
  });

  it('propagates repository errors', async () => {
    const repo = createMockAuthRepository();
    repo.confirmSignUp.mockRejectedValue(new Error('Code mismatch'));

    await expect(
      new ConfirmSignUpUseCase(repo).execute('user@email.com', '000000'),
    ).rejects.toThrow('Code mismatch');
  });
});
