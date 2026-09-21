import { attachmentUrlCache } from '@features/dashboard/application/attachment-url-cache';
import type { DashboardRepository } from '@features/dashboard/domain/repositories/dashboard-repository.port';

/**
 * Adapts an injected signOut function to the DashboardRepository interface.
 * The function is provided by the auth layer (e.g. useAuth().signOut) to ensure
 * proper auth state cleanup (session clearing, refresh timer cancellation).
 */
export class AuthDashboardRepository implements DashboardRepository {
  constructor(private readonly signOutFn: () => Promise<void>) {}

  async signOut(): Promise<void> {
    // Presigned attachment URLs are bearer credentials that outlive the
    // session: whoever holds one reads that object until it expires, no token
    // required. The cache is process-wide, so on a shared device the next
    // account would inherit them. Cleared FIRST so it happens even if the
    // Cognito sign-out itself throws.
    attachmentUrlCache.clear();
    return this.signOutFn();
  }
}
