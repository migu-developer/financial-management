import type { AuthRepository } from '@features/auth/domain/repositories/auth-repository.port';

export class SignOutUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(): Promise<void> {
    return this.authRepository.signOut();
  }
}
