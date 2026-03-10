import type {
  AuthRepository,
  SignUpDto,
} from '@features/auth/domain/repositories/auth-repository.port';
import { InvalidPasswordException } from '@features/auth/domain/errors/auth-errors';
import { Password } from '@features/auth/domain/value-objects/password';

export class SignUpUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(dto: SignUpDto): Promise<void> {
    if (!Password.isValid(dto.password)) {
      throw new InvalidPasswordException();
    }
    return this.authRepository.signUp(dto);
  }
}
