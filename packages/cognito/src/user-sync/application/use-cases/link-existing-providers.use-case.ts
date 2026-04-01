import type { CognitoAdminPort } from '@user-sync/domain/ports/cognito-admin.port';
import { parseExternalProvider } from '@user-sync/infrastructure/adapters/provider-parser';

export interface LinkExistingProvidersInput {
  userPoolId: string;
  email: string;
  nativeUsername: string;
}

export interface LinkExistingProvidersResult {
  action: 'linked' | 'skipped';
  linkedProviders: string[];
}

export class LinkExistingProvidersUseCase {
  constructor(private readonly cognitoAdmin: CognitoAdminPort) {}

  /**
   * Links existing social users to a native user.
   *
   * Cognito constraint: adminLinkProviderForUser only works if the SourceUser
   * has NOT been signed up yet. If the social user already exists (was confirmed),
   * we must delete them first, then link their identity to the native user.
   *
   * Flow per social user:
   * 1. adminDeleteUser(socialUsername) — removes the confirmed social user
   * 2. adminLinkProviderForUser(native, provider) — links the identity (now unregistered)
   */
  async execute(
    input: LinkExistingProvidersInput,
  ): Promise<LinkExistingProvidersResult> {
    const existingUsers = await this.cognitoAdmin.listUsersByEmail(
      input.userPoolId,
      input.email,
    );

    const socialUsers = existingUsers
      .map((u) => ({
        user: u,
        provider: parseExternalProvider(u.username),
      }))
      .filter(
        (
          entry,
        ): entry is typeof entry & {
          provider: NonNullable<typeof entry.provider>;
        } => entry.provider !== null,
      );

    if (socialUsers.length === 0) {
      return { action: 'skipped', linkedProviders: [] };
    }

    const linkedProviders: string[] = [];

    for (const { user, provider } of socialUsers) {
      // 1. Delete the confirmed social user so it becomes "not signed up"
      await this.cognitoAdmin.deleteUser(input.userPoolId, user.username);

      // 2. Link the provider identity to the native user
      await this.cognitoAdmin.linkProviderToUser(
        input.userPoolId,
        input.nativeUsername,
        provider.name,
        provider.userId,
      );
      linkedProviders.push(provider.name);
    }

    return { action: 'linked', linkedProviders };
  }
}
