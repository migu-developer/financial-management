import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminLinkProviderForUserCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type {
  CognitoAdminPort,
  CognitoUser,
} from '@user-sync/domain/ports/cognito-admin.port';

export class CognitoAdminAdapter implements CognitoAdminPort {
  constructor(private readonly client: CognitoIdentityProviderClient) {}

  async listUsersByEmail(
    userPoolId: string,
    email: string,
  ): Promise<CognitoUser[]> {
    const command = new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
      Limit: 10,
    });

    const response = await this.client.send(command);

    return (response.Users ?? []).map((u) => ({
      username: u.Username ?? '',
      attributes: (u.Attributes ?? []).reduce<Record<string, string>>(
        (acc, attr) => {
          if (attr.Name && attr.Value) acc[attr.Name] = attr.Value;
          return acc;
        },
        {},
      ),
      enabled: u.Enabled ?? false,
      status: u.UserStatus ?? '',
    }));
  }

  async linkProviderToUser(
    userPoolId: string,
    existingUsername: string,
    providerName: string,
    providerUserId: string,
  ): Promise<void> {
    const command = new AdminLinkProviderForUserCommand({
      UserPoolId: userPoolId,
      DestinationUser: {
        ProviderName: 'Cognito',
        ProviderAttributeValue: existingUsername,
      },
      SourceUser: {
        ProviderName: providerName,
        ProviderAttributeName: 'Cognito_Subject',
        ProviderAttributeValue: providerUserId,
      },
    });

    await this.client.send(command);
  }

  async deleteUser(userPoolId: string, username: string): Promise<void> {
    const command = new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: username,
    });
    await this.client.send(command);
  }
}
