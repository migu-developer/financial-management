import type { AuthSession } from '@features/auth/domain/entities/auth-session';
import type { User } from '@features/auth/domain/entities/user';

export type SocialProvider = 'google' | 'facebook' | 'apple' | 'microsoft';

export type MfaType = 'SOFTWARE_TOKEN_MFA' | 'SMS_MFA';

export interface PkceParams {
  readonly codeVerifier: string;
  readonly codeChallenge: string;
  readonly state: string;
}

export interface SignUpDto {
  readonly email: string;
  readonly password: string;
  readonly phoneNumber?: string;
  readonly name?: string;
  readonly locale?: string;
  readonly notificationPreference?: 'email' | 'sms' | 'both';
}

export interface ForgotPasswordDelivery {
  readonly destination: string;
  readonly medium: 'email' | 'sms';
}

export enum AuthChallengeType {
  SESSION = 'SESSION',
  NEW_PASSWORD_REQUIRED = 'NEW_PASSWORD_REQUIRED',
  SOFTWARE_TOKEN_MFA = 'SOFTWARE_TOKEN_MFA',
  SMS_MFA = 'SMS_MFA',
  MFA_SETUP = 'MFA_SETUP',
}

export type AuthChallengeResult =
  | { readonly type: AuthChallengeType.SESSION; readonly session: AuthSession }
  | {
      readonly type: AuthChallengeType.NEW_PASSWORD_REQUIRED;
      readonly session: string;
      readonly username: string;
    }
  | {
      readonly type: AuthChallengeType.SOFTWARE_TOKEN_MFA;
      readonly session: string;
    }
  | {
      readonly type: AuthChallengeType.SMS_MFA;
      readonly session: string;
      readonly destination: string;
    }
  | { readonly type: AuthChallengeType.MFA_SETUP; readonly session: string };

export interface AuthRepository {
  signIn(identifier: string, password: string): Promise<AuthChallengeResult>;

  respondToNewPasswordChallenge(
    session: string,
    newPassword: string,
    username: string,
  ): Promise<AuthChallengeResult>;

  respondToMfaChallenge(
    session: string,
    code: string,
    challengeName: MfaType,
  ): Promise<AuthSession>;

  signUp(dto: SignUpDto): Promise<void>;

  confirmSignUp(identifier: string, code: string): Promise<void>;

  resendConfirmationCode(identifier: string): Promise<void>;

  getOAuthSignInUrl(
    provider: SocialProvider,
    redirectUri: string,
  ): Promise<{ url: string; pkce: PkceParams }>;

  handleOAuthCallback(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<AuthSession>;

  initiateForgotPassword(identifier: string): Promise<ForgotPasswordDelivery>;

  confirmForgotPassword(
    identifier: string,
    code: string,
    newPassword: string,
  ): Promise<void>;

  associateSoftwareToken(
    session: string,
  ): Promise<{ secretCode: string; qrCodeUrl: string }>;

  verifySoftwareToken(
    session: string,
    code: string,
    deviceName: string,
  ): Promise<void>;

  getCurrentUser(): Promise<User | null>;

  refreshSession(): Promise<AuthSession>;

  signOut(): Promise<void>;
}
