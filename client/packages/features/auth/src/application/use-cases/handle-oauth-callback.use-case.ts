import type { AuthRepository } from '@features/auth/domain/repositories/auth-repository.port';
import type { AuthSession } from '@features/auth/domain/entities/auth-session';

export class HandleOAuthCallbackUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<AuthSession> {
    return this.authRepository.handleOAuthCallback(
      code,
      codeVerifier,
      redirectUri,
    );
  }
}
