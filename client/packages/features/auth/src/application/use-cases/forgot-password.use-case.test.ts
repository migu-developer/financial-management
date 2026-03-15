import { ForgotPasswordUseCase } from '@features/auth/application/use-cases/forgot-password.use-case';
import { createMockAuthRepository } from './__mocks__/auth-repository.mock';

describe('ForgotPasswordUseCase', () => {
  it('normalizes email and delegates to repository', async () => {
    const repo = createMockAuthRepository();
    repo.initiateForgotPassword.mockResolvedValue({
      destination: 'u***@email.com',
      medium: 'email',
    });

    const result = await new ForgotPasswordUseCase(repo).execute(
      'USER@EMAIL.COM',
    );

    expect(repo.initiateForgotPassword).toHaveBeenCalledWith('user@email.com');
    expect(result.medium).toBe('email');
  });

  it('passes phone trimmed to repository', async () => {
    const repo = createMockAuthRepository();
    repo.initiateForgotPassword.mockResolvedValue({
      destination: '+57***4567',
      medium: 'sms',
    });

    await new ForgotPasswordUseCase(repo).execute('  +573001234567  ');

    expect(repo.initiateForgotPassword).toHaveBeenCalledWith('+573001234567');
  });
});
