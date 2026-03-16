import {
  AuthenticationDetails,
  CognitoAccessToken,
  CognitoIdToken,
  CognitoRefreshToken,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

import { cognitoConfig } from './cognito-config';
import { generatePkce } from './pkce-utils';

import {
  AuthChallengeType,
  type AuthChallengeResult,
  type AuthRepository,
  type ForgotPasswordDelivery,
  type MfaType,
  type PkceParams,
  type SignUpDto,
  type SocialProvider,
} from '@features/auth/domain/repositories/auth-repository.port';
import type { AuthSession } from '@features/auth/domain/entities/auth-session';
import type { User } from '@features/auth/domain/entities/user';
import {
  AliasExistsException,
  CodeMismatchException,
  ExpiredCodeException,
  InvalidPasswordException,
  NetworkException,
  NotAuthorizedException,
  PasswordResetRequiredException,
  TooManyRequestsException,
  UnknownAuthException,
  UsernameExistsException,
  UserNotConfirmedException,
  UserNotFoundException,
} from '@features/auth/domain/errors/auth-errors';
import { IdentifierType } from '@features/auth/domain/utils/constants';

type CognitoErrorLike = { code?: string; message?: string };

type PendingEntry = {
  user: CognitoUser;
  requiredAttributes: Record<string, string>;
};

const PROVIDER_MAP: Record<SocialProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
  apple: 'SignInWithApple',
  microsoft: 'Microsoft',
};

export class CognitoAuthRepository implements AuthRepository {
  private readonly pool: CognitoUserPool;

  // Stores in-progress CognitoUser instances during multi-step auth flows.
  // Key: normalized username (email or phone). Cleared after each flow completes.
  private readonly pending = new Map<string, PendingEntry>();

  constructor() {
    this.pool = new CognitoUserPool({
      UserPoolId: cognitoConfig.userPoolId,
      ClientId: cognitoConfig.clientId,
    });
  }

  // ── Sign-in ──────────────────────────────────────────────────────────────

  async signIn(
    identifier: string,
    password: string,
  ): Promise<AuthChallengeResult> {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({ Username: identifier, Pool: this.pool });
      const authDetails = new AuthenticationDetails({
        Username: identifier,
        Password: password,
      });

      user.authenticateUser(authDetails, {
        onSuccess: (session) => {
          this.pending.delete(identifier);
          resolve({
            type: AuthChallengeType.SESSION,
            session: this.mapSession(session),
          });
        },
        onFailure: (err) => reject(this.mapError(err)),
        newPasswordRequired: (
          _,
          requiredAttributes: Record<string, string>,
        ) => {
          this.pending.set(identifier, {
            user,
            requiredAttributes: requiredAttributes ?? {},
          });
          resolve({
            type: AuthChallengeType.NEW_PASSWORD_REQUIRED,
            session: identifier,
            username: identifier,
          });
        },
        totpRequired: () => {
          this.pending.set(identifier, { user, requiredAttributes: {} });
          resolve({
            type: AuthChallengeType.SOFTWARE_TOKEN_MFA,
            session: identifier,
          });
        },
        mfaRequired: (_, codeDeliveryDetails) => {
          this.pending.set(identifier, { user, requiredAttributes: {} });
          const destination =
            (
              codeDeliveryDetails as {
                CodeDeliveryDetails?: { Destination?: string };
              }
            )?.CodeDeliveryDetails?.Destination ?? '';
          resolve({
            type: AuthChallengeType.SMS_MFA,
            session: identifier,
            destination,
          });
        },
        mfaSetup: () => {
          this.pending.set(identifier, { user, requiredAttributes: {} });
          resolve({ type: AuthChallengeType.MFA_SETUP, session: identifier });
        },
      });
    });
  }

  async respondToNewPasswordChallenge(
    session: string,
    newPassword: string,
  ): Promise<AuthChallengeResult> {
    const entry = this.pending.get(session);
    if (!entry) {
      throw new NotAuthorizedException();
    }

    return new Promise((resolve, reject) => {
      entry.user.completeNewPasswordChallenge(
        newPassword,
        entry.requiredAttributes,
        {
          onSuccess: (cognitoSession) => {
            this.pending.delete(session);
            resolve({
              type: AuthChallengeType.SESSION,
              session: this.mapSession(cognitoSession),
            });
          },
          onFailure: (err) => reject(this.mapError(err)),
          mfaSetup: () =>
            resolve({ type: AuthChallengeType.MFA_SETUP, session }),
          totpRequired: () =>
            resolve({ type: AuthChallengeType.SOFTWARE_TOKEN_MFA, session }),
          mfaRequired: (_, codeDeliveryDetails) => {
            const destination =
              (
                codeDeliveryDetails as {
                  CodeDeliveryDetails?: { Destination?: string };
                }
              )?.CodeDeliveryDetails?.Destination ?? '';
            resolve({ type: AuthChallengeType.SMS_MFA, session, destination });
          },
        },
      );
    });
  }

  async respondToMfaChallenge(
    session: string,
    code: string,
    challengeName: MfaType,
  ): Promise<AuthSession> {
    const entry = this.pending.get(session);
    if (!entry) {
      throw new NotAuthorizedException();
    }

    return new Promise((resolve, reject) => {
      entry.user.sendMFACode(
        code,
        {
          onSuccess: (cognitoSession) => {
            this.pending.delete(session);
            resolve(this.mapSession(cognitoSession));
          },
          onFailure: (err) => reject(this.mapError(err)),
        },
        challengeName,
      );
    });
  }

  // ── Sign-up ──────────────────────────────────────────────────────────────

  async signUp(dto: SignUpDto): Promise<void> {
    return new Promise((resolve, reject) => {
      const attributes: CognitoUserAttribute[] = [
        new CognitoUserAttribute({
          Name: IdentifierType.EMAIL,
          Value: dto.email,
        }),
      ];

      if (dto.name) {
        attributes.push(
          new CognitoUserAttribute({ Name: 'name', Value: dto.name }),
        );
      }
      if (dto.phoneNumber) {
        attributes.push(
          new CognitoUserAttribute({
            Name: 'phone_number',
            Value: dto.phoneNumber,
          }),
        );
      }
      if (dto.locale) {
        attributes.push(
          new CognitoUserAttribute({ Name: 'locale', Value: dto.locale }),
        );
      }

      this.pool.signUp(dto.email, dto.password, attributes, [], (err) => {
        if (err) return reject(this.mapError(err));
        resolve();
      });
    });
  }

  async confirmSignUp(identifier: string, code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({ Username: identifier, Pool: this.pool });
      user.confirmRegistration(code, true, (err) => {
        if (err) return reject(this.mapError(err));
        resolve();
      });
    });
  }

  async resendConfirmationCode(identifier: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({ Username: identifier, Pool: this.pool });
      user.resendConfirmationCode((err) => {
        if (err) return reject(this.mapError(err));
        resolve();
      });
    });
  }

  // ── OAuth (social) ───────────────────────────────────────────────────────

  async getOAuthSignInUrl(
    provider: SocialProvider,
    redirectUri: string,
  ): Promise<{ url: string; pkce: PkceParams }> {
    const pkce = await generatePkce();
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: cognitoConfig.clientId,
      redirect_uri: redirectUri,
      identity_provider: PROVIDER_MAP[provider],
      scope: 'openid email profile phone aws.cognito.signin.user.admin',
      code_challenge: pkce.codeChallenge,
      code_challenge_method: 'S256',
      state: pkce.state,
    });
    const url = `https://${cognitoConfig.domain}/oauth2/authorize?${params.toString()}`;
    return { url, pkce };
  }

  async handleOAuthCallback(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<AuthSession> {
    const response = await fetch(
      `https://${cognitoConfig.domain}/oauth2/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: cognitoConfig.clientId,
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }).toString(),
      },
    );

    if (!response.ok) {
      throw new UnknownAuthException(
        `OAuth token exchange failed: ${response.status}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      id_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Inject the session into the SDK so that getCurrentUser() / refreshSession()
    // work the same way as they do after a regular signIn flow.
    const accessToken = new CognitoAccessToken({
      AccessToken: data.access_token,
    });
    const idToken = new CognitoIdToken({ IdToken: data.id_token });
    const refreshToken = new CognitoRefreshToken({
      RefreshToken: data.refresh_token,
    });

    const cognitoSession = new CognitoUserSession({
      AccessToken: accessToken,
      IdToken: idToken,
      RefreshToken: refreshToken,
    });

    const username =
      (accessToken.payload['username'] as string | undefined) ??
      (accessToken.payload['sub'] as string);

    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: this.pool,
    });
    cognitoUser.setSignInUserSession(cognitoSession);

    return this.mapSession(cognitoSession);
  }

  // ── Forgot password ──────────────────────────────────────────────────────

  async initiateForgotPassword(
    identifier: string,
  ): Promise<ForgotPasswordDelivery> {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({ Username: identifier, Pool: this.pool });
      user.forgotPassword({
        onSuccess: () => {
          resolve({ destination: identifier, medium: IdentifierType.EMAIL });
        },
        onFailure: (err) => reject(this.mapError(err)),
        inputVerificationCode: (data) => {
          const details = (
            data as {
              CodeDeliveryDetails?: {
                Destination?: string;
                DeliveryMedium?: string;
              };
            }
          )?.CodeDeliveryDetails;
          const destination = details?.Destination ?? identifier;
          const medium = (details?.DeliveryMedium?.toLowerCase() ??
            IdentifierType.EMAIL) as IdentifierType.EMAIL | 'sms';
          resolve({ destination, medium });
        },
      });
    });
  }

  async confirmForgotPassword(
    identifier: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({ Username: identifier, Pool: this.pool });
      user.confirmPassword(code, newPassword, {
        onSuccess: () => resolve(),
        onFailure: (err) => reject(this.mapError(err)),
      });
    });
  }

  // ── TOTP setup ───────────────────────────────────────────────────────────

  async associateSoftwareToken(
    session: string,
  ): Promise<{ secretCode: string; qrCodeUrl: string }> {
    const entry = this.pending.get(session);
    if (!entry) {
      throw new NotAuthorizedException();
    }

    return new Promise((resolve, reject) => {
      entry.user.associateSoftwareToken({
        associateSecretCode: (secretCode) => {
          const account = encodeURIComponent(entry.user.getUsername());
          const issuer = encodeURIComponent(cognitoConfig.appName);
          const qrCodeUrl = `otpauth://totp/${issuer}:${account}?secret=${secretCode}&issuer=${issuer}`;
          resolve({ secretCode, qrCodeUrl });
        },
        onFailure: (err) => reject(this.mapError(err)),
      });
    });
  }

  async verifySoftwareToken(
    session: string,
    code: string,
    deviceName: string,
  ): Promise<AuthSession> {
    const entry = this.pending.get(session);
    if (!entry) {
      throw new NotAuthorizedException();
    }

    return new Promise((resolve, reject) => {
      entry.user.verifySoftwareToken(code, deviceName, {
        onSuccess: (cognitoSession) => {
          this.pending.delete(session);
          resolve(this.mapSession(cognitoSession));
        },
        onFailure: (err) => reject(this.mapError(err)),
      });
    });
  }

  // ── User attributes ──────────────────────────────────────────────────────

  async updateUserAttribute(name: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cognitoUser = this.pool.getCurrentUser();
      if (!cognitoUser) {
        return reject(new NotAuthorizedException());
      }

      cognitoUser.getSession(
        (err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session?.isValid()) {
            return reject(new NotAuthorizedException());
          }

          const attributes = [
            new CognitoUserAttribute({ Name: name, Value: value }),
          ];
          cognitoUser.updateAttributes(attributes, (attrErr) => {
            if (attrErr) return reject(this.mapError(attrErr));
            resolve();
          });
        },
      );
    });
  }

  // ── Session management ───────────────────────────────────────────────────

  async getCurrentUser(): Promise<User | null> {
    return new Promise((resolve) => {
      const cognitoUser = this.pool.getCurrentUser();
      if (!cognitoUser) return resolve(null);

      cognitoUser.getSession(
        (err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session?.isValid()) return resolve(null);

          cognitoUser.getUserAttributes((attrErr, attributes) => {
            if (attrErr || !attributes) return resolve(null);
            const userId = session.getIdToken().payload['sub'] as string;
            resolve(this.mapUserAttributes(attributes, userId));
          });
        },
      );
    });
  }

  async refreshSession(): Promise<AuthSession> {
    return new Promise((resolve, reject) => {
      const cognitoUser = this.pool.getCurrentUser();
      if (!cognitoUser) {
        return reject(new NotAuthorizedException());
      }

      cognitoUser.getSession(
        (err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session) return reject(this.mapError(err));
          if (session.isValid()) return resolve(this.mapSession(session));

          cognitoUser.refreshSession(
            session.getRefreshToken(),
            (refreshErr, newSession) => {
              if (refreshErr) return reject(this.mapError(refreshErr));
              resolve(this.mapSession(newSession));
            },
          );
        },
      );
    });
  }

  async signOut(): Promise<void> {
    return new Promise((resolve) => {
      const cognitoUser = this.pool.getCurrentUser();
      if (!cognitoUser) {
        this.pending.clear();
        return resolve();
      }

      cognitoUser.globalSignOut({
        onSuccess: () => {
          this.pending.clear();
          resolve();
        },
        onFailure: () => {
          // Fall back to local sign-out if the session is already expired
          cognitoUser.signOut(() => {
            this.pending.clear();
            resolve();
          });
        },
      });
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private mapSession(session: CognitoUserSession): AuthSession {
    return {
      accessToken: session.getAccessToken().getJwtToken(),
      idToken: session.getIdToken().getJwtToken(),
      refreshToken: session.getRefreshToken().getToken(),
      expiresAt: new Date(session.getAccessToken().getExpiration() * 1_000),
      userId: session.getIdToken().payload['sub'] as string,
    };
  }

  private mapUserAttributes(
    attributes: CognitoUserAttribute[],
    userId: string,
  ): User {
    const get = (name: string) =>
      attributes.find((a) => a.getName() === name)?.getValue();
    const updatedAtRaw = get('updated_at');

    let providerUserId: string | undefined;
    const identitiesRaw = get('identities');
    if (identitiesRaw) {
      try {
        const identities = JSON.parse(identitiesRaw) as Array<{
          userId?: string;
        }>;
        providerUserId = identities[0]?.userId;
      } catch {
        // identities attribute is malformed — ignore
      }
    }

    return {
      userId,
      email: get('email') ?? '',
      givenName: get('given_name') ?? '',
      fullname: get('name') ?? '',
      phoneNumber: get('phone_number'),
      birthdate: get('birthdate'),
      profilePicture: get('picture'),
      locale: get('locale'),
      address: get('address'),
      lastUpdateTime: updatedAtRaw
        ? new Date(Number(updatedAtRaw) * 1_000)
        : undefined,
      emailVerified: get('email_verified') === 'true',
      phoneVerified: get('phone_number_verified') === 'true',
      providerUserId,
    };
  }

  private mapError(err: unknown): Error {
    if (!err || typeof err !== 'object') return new UnknownAuthException();
    const { code, message } = err as CognitoErrorLike;
    switch (code) {
      case 'NotAuthorizedException':
        return new NotAuthorizedException();
      case 'UserNotFoundException':
        return new UserNotFoundException();
      case 'UsernameExistsException':
        return new UsernameExistsException();
      case 'AliasExistsException':
        return new AliasExistsException();
      case 'CodeMismatchException':
        return new CodeMismatchException();
      case 'ExpiredCodeException':
        return new ExpiredCodeException();
      case 'InvalidPasswordException':
        return new InvalidPasswordException(message);
      case 'UserNotConfirmedException':
        return new UserNotConfirmedException();
      case 'PasswordResetRequiredException':
        return new PasswordResetRequiredException();
      case 'TooManyRequestsException':
      case 'TooManyFailedAttemptsException':
        return new TooManyRequestsException();
      case 'NetworkError':
        return new NetworkException();
      default:
        return new UnknownAuthException(message);
    }
  }
}

export const cognitoAuthRepository = new CognitoAuthRepository();
