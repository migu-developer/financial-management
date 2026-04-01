import type {
  UserProfile,
  CreateUserInput,
} from '@packages/models/users/types';
import type { UserRepository } from '@services/users/domain/repositories/user.repository';

export class CreateUserUseCase {
  constructor(private readonly repository: UserRepository) {}

  async execute(
    input: CreateUserInput,
    createdBy: string,
  ): Promise<UserProfile> {
    return this.repository.create(input, createdBy);
  }
}
