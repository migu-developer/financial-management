import type {
  AuthRepository,
  PkceParams,
  SocialProvider,
} from '@features/auth/domain/repositories/auth-repository.port';

export interface SocialSignInResult {
  readonly url: string;
  readonly pkce: PkceParams;
}

export class InitiateSocialSignInUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(
    provider: SocialProvider,
    redirectUri: string,
  ): Promise<SocialSignInResult> {
    return this.authRepository.getOAuthSignInUrl(provider, redirectUri);
  }
}
