import type { DashboardRepository } from '@features/dashboard/domain/repositories/dashboard-repository.port';

/**
 * Adapts an injected signOut function to the DashboardRepository interface.
 * The function is provided by the auth layer (e.g. useAuth().signOut) to ensure
 * proper auth state cleanup (session clearing, refresh timer cancellation).
 */
export class AuthDashboardRepository implements DashboardRepository {
  constructor(private readonly signOutFn: () => Promise<void>) {}

  async signOut(): Promise<void> {
    return this.signOutFn();
  }
}
