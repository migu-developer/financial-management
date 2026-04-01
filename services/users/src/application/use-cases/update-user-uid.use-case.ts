import type { UserProfile } from '@packages/models/users/types';
import type { UserRepository } from '@services/users/domain/repositories/user.repository';

export class UpdateUserUidUseCase {
  constructor(private readonly repository: UserRepository) {}

  async execute(
    email: string,
    newUid: string,
    modifiedBy: string,
  ): Promise<UserProfile> {
    return this.repository.updateUid(email, newUid, modifiedBy);
  }
}
