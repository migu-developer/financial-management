import type {
  AuthRepository,
  ForgotPasswordDelivery,
} from '@features/auth/domain/repositories/auth-repository.port';
import { Identifier } from '@features/auth/domain/value-objects/identifier';

export class ForgotPasswordUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(rawIdentifier: string): Promise<ForgotPasswordDelivery> {
    const { normalizedValue } = Identifier.parse(rawIdentifier);
    return this.authRepository.initiateForgotPassword(normalizedValue);
  }
}
