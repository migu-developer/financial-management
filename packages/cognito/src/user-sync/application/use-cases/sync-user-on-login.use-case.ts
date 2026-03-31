import type {
  UserProfile,
  CreateUserInput,
  PatchUserInput,
} from '@packages/models/users/types';
import type { UserSyncPort } from '@user-sync/domain/ports/user-sync.port';

export interface SyncOnLoginResult {
  action: 'updated' | 'created';
  user: UserProfile;
}

export class SyncUserOnLoginUseCase {
  constructor(private readonly port: UserSyncPort) {}

  async execute(
    uid: string,
    createInput: CreateUserInput,
    patchInput: PatchUserInput,
    modifiedBy: string,
  ): Promise<SyncOnLoginResult> {
    const existing = await this.port.findByUid(uid);
    if (existing) {
      const user = await this.port.patch(uid, patchInput, modifiedBy);
      return { action: 'updated', user };
    }
    const user = await this.port.create(createInput, modifiedBy);
    return { action: 'created', user };
  }
}
