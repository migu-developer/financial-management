import type { UserProfile } from '@packages/models/users/types';
import type { UserRepository } from '@services/users/domain/repositories/user.repository';

export class GetUserByEmailUseCase {
  constructor(private readonly repository: UserRepository) {}

  async execute(email: string): Promise<UserProfile | null> {
    return this.repository.findByEmail(email);
  }
}
