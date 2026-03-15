import { SetupTotpUseCase } from '@features/auth/application/use-cases/setup-totp.use-case';
import { createMockAuthRepository } from './__mocks__/auth-repository.mock';

describe('SetupTotpUseCase', () => {
  it('delegates to repository and returns setup result', async () => {
    const repo = createMockAuthRepository();
    repo.associateSoftwareToken.mockResolvedValue({
      secretCode: 'ABCDEF123456',
      qrCodeUrl: 'otpauth://totp/App:user@email.com?secret=ABCDEF123456',
    });

    const result = await new SetupTotpUseCase(repo).execute('session-token');

    expect(repo.associateSoftwareToken).toHaveBeenCalledWith('session-token');
    expect(result.secretCode).toBe('ABCDEF123456');
    expect(result.qrCodeUrl).toContain('otpauth://totp');
  });
});
