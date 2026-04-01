import type { UserProfile } from '@packages/models/users/types';
import type { UserRepository } from '@services/users/domain/repositories/user.repository';
import { ModuleNotFoundError } from '@packages/models/shared/utils/errors';

export class GetUserByUidUseCase {
  constructor(private readonly repository: UserRepository) {}

  async execute(uid: string): Promise<UserProfile> {
    const user = await this.repository.findByUid(uid);
    if (!user) throw new ModuleNotFoundError();
    return user;
  }
}
