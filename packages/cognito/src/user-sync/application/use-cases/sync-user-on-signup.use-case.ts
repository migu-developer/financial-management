import type {
  UserProfile,
  CreateUserInput,
} from '@packages/models/users/types';
import type { UserSyncPort } from '@user-sync/domain/ports/user-sync.port';

export interface SyncOnSignupResult {
  action: 'created' | 'skipped';
  user: UserProfile | null;
}

export class SyncUserOnSignupUseCase {
  constructor(private readonly port: UserSyncPort) {}

  async execute(
    input: CreateUserInput,
    createdBy: string,
  ): Promise<SyncOnSignupResult> {
    const existing = await this.port.findByUid(input.uid);
    if (existing) {
      return { action: 'skipped', user: existing };
    }
    const user = await this.port.create(input, createdBy);
    return { action: 'created', user };
  }
}
