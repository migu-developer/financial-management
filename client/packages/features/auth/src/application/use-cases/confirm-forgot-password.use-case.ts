import type { AuthRepository } from '@features/auth/domain/repositories/auth-repository.port';
import { InvalidPasswordException } from '@features/auth/domain/errors/auth-errors';
import { Identifier } from '@features/auth/domain/value-objects/identifier';
import { Password } from '@features/auth/domain/value-objects/password';

export class ConfirmForgotPasswordUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(
    rawIdentifier: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    if (!Password.isValid(newPassword)) {
      throw new InvalidPasswordException();
    }

    const { normalizedValue } = Identifier.parse(rawIdentifier);
    return this.authRepository.confirmForgotPassword(
      normalizedValue,
      code,
      newPassword,
    );
  }
}
