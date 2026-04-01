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

    for (const { provider } of socialUsers) {
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
