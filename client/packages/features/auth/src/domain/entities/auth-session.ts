export interface AuthSession {
  readonly accessToken: string;
  readonly idToken: string;
  readonly refreshToken: string;
  readonly expiresAt: Date;
  readonly userId: string;
}

export function isSessionExpired(session: AuthSession): boolean {
  return Date.now() >= session.expiresAt.getTime();
}

export function sessionExpiresInMs(session: AuthSession): number {
  return session.expiresAt.getTime() - Date.now();
}
