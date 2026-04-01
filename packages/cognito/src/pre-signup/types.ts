export type PreSignUpTriggerSource =
  | 'PreSignUp_SignUp'
  | 'PreSignUp_ExternalProvider'
  | 'PreSignUp_AdminCreateUser';

export interface PreSignUpEvent {
  version: string;
  region: string;
  userPoolId: string;
  triggerSource: PreSignUpTriggerSource;
  userName: string;
  callerContext: {
    awsSdkVersion: string;
    clientId: string;
  };
  request: {
    userAttributes: Record<string, string>;
    validationData?: Record<string, string>;
    clientMetadata?: Record<string, string>;
  };
  response: {
    autoConfirmUser: boolean;
    autoVerifyEmail: boolean;
    autoVerifyPhone: boolean;
  };
}
