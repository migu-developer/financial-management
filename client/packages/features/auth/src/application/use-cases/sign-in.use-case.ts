import type {
  AuthChallengeResult,
  AuthRepository,
} from '@features/auth/domain/repositories/auth-repository.port';
import { Identifier } from '@features/auth/domain/value-objects/identifier';

export class SignInUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(
    rawIdentifier: string,
    password: string,
  ): Promise<AuthChallengeResult> {
    const { normalizedValue } = Identifier.parse(rawIdentifier);
    return this.authRepository.signIn(normalizedValue, password);
  }
}
