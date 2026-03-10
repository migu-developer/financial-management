import type {
  AuthChallengeResult,
  ForgotPasswordDelivery,
  MfaType,
  PkceParams,
  SignUpDto,
  SocialProvider,
} from '@features/auth/domain/repositories/auth-repository.port';
import type { AuthSession } from '@features/auth/domain/entities/auth-session';

const mockSession: AuthSession = {
  accessToken: 'access-token',
  idToken: 'id-token',
  refreshToken: 'refresh-token',
  expiresAt: new Date(Date.now() + 3600_000),
  userId: 'user-123',
};

describe('AuthChallengeResult discriminated union', () => {
  it('SESSION variant contains an AuthSession', () => {
    const result: AuthChallengeResult = {
      type: 'SESSION',
      session: mockSession,
    };
    expect(result.type).toBe('SESSION');
    if (result.type === 'SESSION') {
      expect(result.session.accessToken).toBe('access-token');
      expect(result.session.userId).toBe('user-123');
    }
  });

  it('NEW_PASSWORD_REQUIRED variant contains session string and username', () => {
    const result: AuthChallengeResult = {
      type: 'NEW_PASSWORD_REQUIRED',
      session: 'challenge-session',
      username: 'user@example.com',
    };
    expect(result.type).toBe('NEW_PASSWORD_REQUIRED');
    if (result.type === 'NEW_PASSWORD_REQUIRED') {
      expect(result.session).toBe('challenge-session');
      expect(result.username).toBe('user@example.com');
    }
  });

  it('SOFTWARE_TOKEN_MFA variant contains only session', () => {
    const result: AuthChallengeResult = {
      type: 'SOFTWARE_TOKEN_MFA',
      session: 'mfa-session',
    };
    expect(result.type).toBe('SOFTWARE_TOKEN_MFA');
    if (result.type === 'SOFTWARE_TOKEN_MFA') {
      expect(result.session).toBe('mfa-session');
    }
  });

  it('SMS_MFA variant contains session and destination', () => {
    const result: AuthChallengeResult = {
      type: 'SMS_MFA',
      session: 'sms-session',
      destination: '+57***4567',
    };
    expect(result.type).toBe('SMS_MFA');
    if (result.type === 'SMS_MFA') {
      expect(result.session).toBe('sms-session');
      expect(result.destination).toBe('+57***4567');
    }
  });

  it('MFA_SETUP variant contains only session', () => {
    const result: AuthChallengeResult = {
      type: 'MFA_SETUP',
      session: 'setup-session',
    };
    expect(result.type).toBe('MFA_SETUP');
    if (result.type === 'MFA_SETUP') {
      expect(result.session).toBe('setup-session');
    }
  });

  it('all five variants are distinguishable by type field', () => {
    const types = [
      'SESSION',
      'NEW_PASSWORD_REQUIRED',
      'SOFTWARE_TOKEN_MFA',
      'SMS_MFA',
      'MFA_SETUP',
    ];
    const results: AuthChallengeResult[] = [
      { type: 'SESSION', session: mockSession },
      { type: 'NEW_PASSWORD_REQUIRED', session: 's', username: 'u' },
      { type: 'SOFTWARE_TOKEN_MFA', session: 's' },
      { type: 'SMS_MFA', session: 's', destination: 'd' },
      { type: 'MFA_SETUP', session: 's' },
    ];
    results.forEach((r, i) => expect(r.type).toBe(types[i]));
  });
});

describe('SocialProvider', () => {
  const providers: SocialProvider[] = [
    'google',
    'facebook',
    'apple',
    'microsoft',
  ];

  it('includes all four expected providers', () => {
    expect(providers).toHaveLength(4);
    expect(providers).toContain('google');
    expect(providers).toContain('facebook');
    expect(providers).toContain('apple');
    expect(providers).toContain('microsoft');
  });
});

describe('MfaType', () => {
  const mfaTypes: MfaType[] = ['SOFTWARE_TOKEN_MFA', 'SMS_MFA'];

  it('includes TOTP and SMS variants', () => {
    expect(mfaTypes).toContain('SOFTWARE_TOKEN_MFA');
    expect(mfaTypes).toContain('SMS_MFA');
  });
});

describe('ForgotPasswordDelivery', () => {
  it('has destination and medium for email delivery', () => {
    const delivery: ForgotPasswordDelivery = {
      destination: 'u***@example.com',
      medium: 'email',
    };
    expect(delivery.destination).toBe('u***@example.com');
    expect(delivery.medium).toBe('email');
  });

  it('has destination and medium for sms delivery', () => {
    const delivery: ForgotPasswordDelivery = {
      destination: '+57***4567',
      medium: 'sms',
    };
    expect(delivery.medium).toBe('sms');
  });
});

describe('PkceParams', () => {
  it('contains codeVerifier, codeChallenge, and state', () => {
    const pkce: PkceParams = {
      codeVerifier: 'verifier-abc123',
      codeChallenge: 'challenge-xyz456',
      state: 'state-random',
    };
    expect(pkce.codeVerifier).toBe('verifier-abc123');
    expect(pkce.codeChallenge).toBe('challenge-xyz456');
    expect(pkce.state).toBe('state-random');
  });
});

describe('SignUpDto', () => {
  it('requires only email and password', () => {
    const dto: SignUpDto = {
      email: 'user@example.com',
      password: 'SecureP@ss1',
    };
    expect(dto.email).toBe('user@example.com');
    expect(dto.phoneNumber).toBeUndefined();
    expect(dto.locale).toBeUndefined();
    expect(dto.notificationPreference).toBeUndefined();
  });

  it('accepts all optional fields', () => {
    const dto: SignUpDto = {
      email: 'user@example.com',
      password: 'SecureP@ss1',
      phoneNumber: '+573001234567',
      name: 'John Doe',
      locale: 'es',
      notificationPreference: 'both',
    };
    expect(dto.phoneNumber).toBe('+573001234567');
    expect(dto.notificationPreference).toBe('both');
  });
});
