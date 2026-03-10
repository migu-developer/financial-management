import { ConfirmForgotPasswordUseCase } from '@features/auth/application/use-cases/confirm-forgot-password.use-case';
import { createMockAuthRepository } from './__mocks__/auth-repository.mock';
import { InvalidPasswordException } from '@features/auth/domain/errors/auth-errors';

describe('ConfirmForgotPasswordUseCase', () => {
  it('normalizes email and calls repository when password is valid', async () => {
    const repo = createMockAuthRepository();
    repo.confirmForgotPassword.mockResolvedValue(undefined);

    await new ConfirmForgotPasswordUseCase(repo).execute(
      'USER@EMAIL.COM',
      '123456',
      'SecureP@ss1',
    );

    expect(repo.confirmForgotPassword).toHaveBeenCalledWith(
      'user@email.com',
      '123456',
      'SecureP@ss1',
    );
  });

  it('throws InvalidPasswordException for weak new password', async () => {
    const repo = createMockAuthRepository();

    await expect(
      new ConfirmForgotPasswordUseCase(repo).execute(
        'user@email.com',
        '123456',
        'weak',
      ),
    ).rejects.toThrow(InvalidPasswordException);

    expect(repo.confirmForgotPassword).not.toHaveBeenCalled();
  });
});
