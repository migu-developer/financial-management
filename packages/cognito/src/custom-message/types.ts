export type CustomMessageTriggerSource =
  | 'CustomMessage_SignUp'
  | 'CustomMessage_AdminCreateUser'
  | 'CustomMessage_ResendCode'
  | 'CustomMessage_ForgotPassword'
  | 'CustomMessage_UpdateUserAttribute'
  | 'CustomMessage_VerifyUserAttribute';

export interface CustomMessageTriggerEvent {
  version: string;
  region: string;
  userPoolId: string;
  triggerSource: CustomMessageTriggerSource;
  userName: string;
  callerContext: {
    awsSdkVersion: string;
    clientId: string;
  };
  request: {
    userAttributes: Record<string, string>;
    codeParameter: string;
    usernameParameter: string;
    linkParameter?: string;
  };
  response: {
    smsMessage: string | null;
    emailMessage: string | null;
    emailSubject: string | null;
  };
}

export type SupportedLocale = 'es' | 'en';

export interface MessageContent {
  emailSubject: string;
  smsMessage: string;
}

export type LocaleMessages = Record<CustomMessageTriggerSource, MessageContent>;
