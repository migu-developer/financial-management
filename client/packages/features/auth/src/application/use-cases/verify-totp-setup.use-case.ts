import type { AuthRepository } from '@features/auth/domain/repositories/auth-repository.port';

export class VerifyTotpSetupUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(
    session: string,
    code: string,
    deviceName: string,
  ): Promise<void> {
    return this.authRepository.verifySoftwareToken(session, code, deviceName);
  }
}
