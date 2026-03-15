import type { AuthRepository } from '@features/auth/domain/repositories/auth-repository.port';

export interface TotpSetupResult {
  readonly secretCode: string;
  readonly qrCodeUrl: string;
}

export class SetupTotpUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(session: string): Promise<TotpSetupResult> {
    return this.authRepository.associateSoftwareToken(session);
  }
}
