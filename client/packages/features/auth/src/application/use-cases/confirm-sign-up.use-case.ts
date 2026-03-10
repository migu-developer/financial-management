import type { AuthRepository } from '@features/auth/domain/repositories/auth-repository.port';
import { Identifier } from '@features/auth/domain/value-objects/identifier';

export class ConfirmSignUpUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(rawIdentifier: string, code: string): Promise<void> {
    const { normalizedValue } = Identifier.parse(rawIdentifier);
    return this.authRepository.confirmSignUp(normalizedValue, code);
  }
}
