import type { UserProfile, PatchUserInput } from '@packages/models/users/types';
import type { UserRepository } from '@services/users/domain/repositories/user.repository';

export class PatchUserUseCase {
  constructor(private readonly repository: UserRepository) {}

  async execute(
    uid: string,
    input: PatchUserInput,
    modifiedBy: string,
  ): Promise<UserProfile> {
    return this.repository.patch(uid, input, modifiedBy);
  }
}
