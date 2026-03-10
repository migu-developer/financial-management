import { VerifyTotpSetupUseCase } from '@features/auth/application/use-cases/verify-totp-setup.use-case';
import { createMockAuthRepository } from './__mocks__/auth-repository.mock';

describe('VerifyTotpSetupUseCase', () => {
  it('delegates to repository with all params', async () => {
    const repo = createMockAuthRepository();
    repo.verifySoftwareToken.mockResolvedValue(undefined);

    await new VerifyTotpSetupUseCase(repo).execute(
      'session-token',
      '123456',
      'My Device',
    );

    expect(repo.verifySoftwareToken).toHaveBeenCalledWith(
      'session-token',
      '123456',
      'My Device',
    );
  });

  it('propagates repository errors', async () => {
    const repo = createMockAuthRepository();
    repo.verifySoftwareToken.mockRejectedValue(new Error('Invalid code'));

    await expect(
      new VerifyTotpSetupUseCase(repo).execute(
        'session-token',
        '000000',
        'My Device',
      ),
    ).rejects.toThrow('Invalid code');
  });
});
