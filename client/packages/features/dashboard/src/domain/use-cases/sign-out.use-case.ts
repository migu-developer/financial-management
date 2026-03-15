import type { DashboardRepository } from '@features/dashboard/domain/repositories/dashboard-repository.port';

export class SignOutUseCase {
  constructor(private readonly repository: DashboardRepository) {}

  async execute(): Promise<void> {
    return this.repository.signOut();
  }
}
