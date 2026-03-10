import type {
  AuthChallengeResult,
  AuthRepository,
  MfaType,
} from '@features/auth/domain/repositories/auth-repository.port';
import type { AuthSession } from '@features/auth/domain/entities/auth-session';
import { InvalidPasswordException } from '@features/auth/domain/errors/auth-errors';
import { Password } from '@features/auth/domain/value-objects/password';

export class RespondToNewPasswordChallengeUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(
    session: string,
    newPassword: string,
    username: string,
  ): Promise<AuthChallengeResult> {
    if (!Password.isValid(newPassword)) {
      throw new InvalidPasswordException();
    }
    return this.authRepository.respondToNewPasswordChallenge(
      session,
      newPassword,
      username,
    );
  }
}

export class RespondToMfaChallengeUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(
    session: string,
    code: string,
    challengeName: MfaType,
  ): Promise<AuthSession> {
    return this.authRepository.respondToMfaChallenge(
      session,
      code,
      challengeName,
    );
  }
}
