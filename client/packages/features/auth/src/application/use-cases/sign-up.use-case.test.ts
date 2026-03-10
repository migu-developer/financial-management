import { SignUpUseCase } from '@features/auth/application/use-cases/sign-up.use-case';
import { createMockAuthRepository } from './__mocks__/auth-repository.mock';
import { InvalidPasswordException } from '@features/auth/domain/errors/auth-errors';
import type { SignUpDto } from '@features/auth/domain/repositories/auth-repository.port';

const validDto: SignUpDto = {
  email: 'user@example.com',
  password: 'SecureP@ss1',
  name: 'John Doe',
  locale: 'en',
};

describe('SignUpUseCase', () => {
  it('calls repository with the provided DTO when password is valid', async () => {
    const repo = createMockAuthRepository();
    repo.signUp.mockResolvedValue(undefined);

    await new SignUpUseCase(repo).execute(validDto);

    expect(repo.signUp).toHaveBeenCalledWith(validDto);
  });

  it('throws InvalidPasswordException for a weak password', async () => {
    const repo = createMockAuthRepository();

    await expect(
      new SignUpUseCase(repo).execute({ ...validDto, password: 'weak' }),
    ).rejects.toThrow(InvalidPasswordException);

    expect(repo.signUp).not.toHaveBeenCalled();
  });

  it('throws InvalidPasswordException for password missing special char', async () => {
    const repo = createMockAuthRepository();

    await expect(
      new SignUpUseCase(repo).execute({ ...validDto, password: 'SecurePass1' }),
    ).rejects.toThrow(InvalidPasswordException);
  });

  it('propagates repository errors', async () => {
    const repo = createMockAuthRepository();
    repo.signUp.mockRejectedValue(new Error('Network error'));

    await expect(new SignUpUseCase(repo).execute(validDto)).rejects.toThrow(
      'Network error',
    );
  });
});
