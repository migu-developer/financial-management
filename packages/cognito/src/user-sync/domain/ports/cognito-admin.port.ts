export interface CognitoUser {
  username: string;
  attributes: Record<string, string>;
  enabled: boolean;
  status: string;
}

export interface CognitoAdminPort {
  listUsersByEmail(userPoolId: string, email: string): Promise<CognitoUser[]>;

  linkProviderToUser(
    userPoolId: string,
    existingUsername: string,
    providerName: string,
    providerUserId: string,
  ): Promise<void>;

  deleteUser(userPoolId: string, username: string): Promise<void>;
}
