import {
  isSessionExpired,
  sessionExpiresInMs,
  type AuthSession,
} from '@features/auth/domain/entities/auth-session';

function makeSession(expiresInMs: number): AuthSession {
  return {
    accessToken: 'access-token',
    idToken: 'id-token',
    refreshToken: 'refresh-token',
    expiresAt: new Date(Date.now() + expiresInMs),
    userId: 'user-123',
  };
}

describe('isSessionExpired', () => {
  it('returns false when session has not expired', () => {
    const session = makeSession(60_000);
    expect(isSessionExpired(session)).toBe(false);
  });

  it('returns true when session has expired', () => {
    const session = makeSession(-1);
    expect(isSessionExpired(session)).toBe(true);
  });

  it('returns true when expiresAt is exactly now', () => {
    const session = makeSession(0);
    expect(isSessionExpired(session)).toBe(true);
  });
});

describe('sessionExpiresInMs', () => {
  it('returns positive value for future expiration', () => {
    const session = makeSession(30_000);
    expect(sessionExpiresInMs(session)).toBeGreaterThan(0);
    expect(sessionExpiresInMs(session)).toBeLessThanOrEqual(30_000);
  });

  it('returns negative value for expired session', () => {
    const session = makeSession(-10_000);
    expect(sessionExpiresInMs(session)).toBeLessThan(0);
  });
});
