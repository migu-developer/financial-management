import type { CognitoAdminPort } from '@user-sync/domain/ports/cognito-admin.port';

export interface LinkProviderInput {
  userPoolId: string;
  email: string;
  providerName: string;
  providerUserId: string;
}

export interface LinkProviderResult {
  action: 'linked' | 'skipped';
  existingUsername?: string;
}

export class LinkProviderUseCase {
  constructor(private readonly cognitoAdmin: CognitoAdminPort) {}

  async execute(input: LinkProviderInput): Promise<LinkProviderResult> {
    const existingUsers = await this.cognitoAdmin.listUsersByEmail(
      input.userPoolId,
      input.email,
    );

    const nativeUser = existingUsers.find(
      (u) =>
        !u.username.startsWith('Google_') &&
        !u.username.startsWith('Facebook_') &&
        !u.username.startsWith('SignInWithApple_') &&
        !u.username.startsWith('Microsoft_'),
    );

    if (!nativeUser) {
      return { action: 'skipped' };
    }

    await this.cognitoAdmin.linkProviderToUser(
      input.userPoolId,
      nativeUser.username,
      input.providerName,
      input.providerUserId,
    );

    return { action: 'linked', existingUsername: nativeUser.username };
  }
}
