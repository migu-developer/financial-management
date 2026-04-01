import type {
  UserProfile,
  CreateUserInput,
  PatchUserInput,
} from '@packages/models/users/types';

export interface UserRepository {
  findByUid(uid: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  create(input: CreateUserInput, createdBy: string): Promise<UserProfile>;
  patch(
    uid: string,
    input: PatchUserInput,
    modifiedBy: string,
  ): Promise<UserProfile>;
  updateUid(
    email: string,
    newUid: string,
    modifiedBy: string,
  ): Promise<UserProfile>;
}
