export type UserSyncTriggerSource =
  | 'PostConfirmation_ConfirmSignUp'
  | 'PostConfirmation_ConfirmForgotPassword'
  | 'PostAuthentication_Authentication';

export interface CognitoUserSyncEvent {
  version: string;
  region: string;
  userPoolId: string;
  triggerSource: UserSyncTriggerSource;
  userName: string;
  callerContext: {
    awsSdkVersion: string;
    clientId: string;
  };
  request: {
    userAttributes: Record<string, string>;
    newDeviceUsed?: boolean;
  };
  response: Record<string, unknown>;
}
