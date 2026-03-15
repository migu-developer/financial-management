import {
  NotAuthorizedException,
  UserNotFoundException,
  UsernameExistsException,
  AliasExistsException,
  CodeMismatchException,
  ExpiredCodeException,
  InvalidPasswordException,
  UserNotConfirmedException,
  PasswordResetRequiredException,
  TooManyRequestsException,
  NetworkException,
  UnknownAuthException,
} from '@features/auth/domain/errors/auth-errors';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('./cognito-config', () => ({
  cognitoConfig: {
    userPoolId: 'us-east-1_test',
    clientId: 'test-client-id',
    domain: 'test.auth.us-east-1.amazoncognito.com',
    region: 'us-east-1',
    appName: 'Financial Management',
  },
}));

jest.mock('amazon-cognito-identity-js', () => ({
  CognitoUserPool: jest.fn(),
  CognitoUser: jest.fn(),
  CognitoUserAttribute: jest
    .fn()
    .mockImplementation(({ Name, Value }: { Name: string; Value: string }) => ({
      getName: () => Name,
      getValue: () => Value,
    })),
  AuthenticationDetails: jest.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

import { CognitoUserPool, CognitoUser } from 'amazon-cognito-identity-js';

import { CognitoAuthRepository } from './cognito-auth-repository';

type MockCognitoUser = {
  authenticateUser: jest.Mock;
  completeNewPasswordChallenge: jest.Mock;
  sendMFACode: jest.Mock;
  confirmRegistration: jest.Mock;
  resendConfirmationCode: jest.Mock;
  forgotPassword: jest.Mock;
  confirmPassword: jest.Mock;
  associateSoftwareToken: jest.Mock;
  verifySoftwareToken: jest.Mock;
  getSession: jest.Mock;
  getUserAttributes: jest.Mock;
  getUsername: jest.Mock;
  globalSignOut: jest.Mock;
  signOut: jest.Mock;
  refreshSession: jest.Mock;
};

type MockPool = {
  getCurrentUser: jest.Mock;
  signUp: jest.Mock;
};

function makeMockUser(): MockCognitoUser {
  return {
    authenticateUser: jest.fn(),
    completeNewPasswordChallenge: jest.fn(),
    sendMFACode: jest.fn(),
    confirmRegistration: jest.fn(),
    resendConfirmationCode: jest.fn(),
    forgotPassword: jest.fn(),
    confirmPassword: jest.fn(),
    associateSoftwareToken: jest.fn(),
    verifySoftwareToken: jest.fn(),
    getSession: jest.fn(),
    getUserAttributes: jest.fn(),
    getUsername: jest.fn().mockReturnValue('test@example.com'),
    globalSignOut: jest.fn(),
    signOut: jest.fn(),
    refreshSession: jest.fn(),
  };
}

function makeMockSession() {
  return {
    getAccessToken: () => ({
      getJwtToken: () => 'mock-access-token',
      getExpiration: () => Math.floor(Date.now() / 1000) + 3600,
    }),
    getIdToken: () => ({
      getJwtToken: () => 'mock-id-token',
      payload: { sub: 'user-123' },
    }),
    getRefreshToken: () => ({
      getToken: () => 'mock-refresh-token',
    }),
    isValid: () => true,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CognitoAuthRepository', () => {
  let repo: CognitoAuthRepository;
  let mockUser: MockCognitoUser;
  let mockPool: MockPool;

  beforeEach(() => {
    mockUser = makeMockUser();
    mockPool = {
      getCurrentUser: jest.fn().mockReturnValue(null),
      signUp: jest.fn(),
    };
    (CognitoUser as jest.Mock).mockImplementation(() => mockUser);
    (CognitoUserPool as jest.Mock).mockImplementation(() => mockPool);
    repo = new CognitoAuthRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── signIn ──────────────────────────────────────────────────────────────────

  describe('signIn', () => {
    it('resolves SESSION on success', async () => {
      const session = makeMockSession();
      mockUser.authenticateUser.mockImplementation(
        (_: unknown, cb: { onSuccess: (s: unknown) => void }) => {
          cb.onSuccess(session);
        },
      );

      const result = await repo.signIn('user@example.com', 'pass');

      expect(result.type).toBe('SESSION');
      if (result.type === 'SESSION') {
        expect(result.session.accessToken).toBe('mock-access-token');
        expect(result.session.userId).toBe('user-123');
      }
    });

    it('resolves NEW_PASSWORD_REQUIRED on challenge', async () => {
      mockUser.authenticateUser.mockImplementation(
        (
          _: unknown,
          cb: {
            newPasswordRequired: (
              attrs: unknown,
              required: Record<string, string>,
            ) => void;
          },
        ) => {
          cb.newPasswordRequired({}, { given_name: '' });
        },
      );

      const result = await repo.signIn('user@example.com', 'pass');

      expect(result.type).toBe('NEW_PASSWORD_REQUIRED');
    });

    it('resolves SOFTWARE_TOKEN_MFA on totpRequired', async () => {
      mockUser.authenticateUser.mockImplementation(
        (_: unknown, cb: { totpRequired: () => void }) => {
          cb.totpRequired();
        },
      );

      const result = await repo.signIn('user@example.com', 'pass');
      expect(result.type).toBe('SOFTWARE_TOKEN_MFA');
    });

    it('resolves SMS_MFA with destination on mfaRequired', async () => {
      mockUser.authenticateUser.mockImplementation(
        (
          _: unknown,
          cb: { mfaRequired: (name: unknown, details: unknown) => void },
        ) => {
          cb.mfaRequired('SMS_MFA', {
            CodeDeliveryDetails: { Destination: '+1***456' },
          });
        },
      );

      const result = await repo.signIn('user@example.com', 'pass');
      expect(result.type).toBe('SMS_MFA');
      if (result.type === 'SMS_MFA') {
        expect(result.destination).toBe('+1***456');
      }
    });

    it('resolves MFA_SETUP on mfaSetup', async () => {
      mockUser.authenticateUser.mockImplementation(
        (_: unknown, cb: { mfaSetup: () => void }) => {
          cb.mfaSetup();
        },
      );

      const result = await repo.signIn('user@example.com', 'pass');
      expect(result.type).toBe('MFA_SETUP');
    });
  });

  // ── mapError ────────────────────────────────────────────────────────────────

  describe('mapError — all error code mappings', () => {
    const cases: [string, new () => Error][] = [
      ['NotAuthorizedException', NotAuthorizedException],
      ['UserNotFoundException', UserNotFoundException],
      ['UsernameExistsException', UsernameExistsException],
      ['AliasExistsException', AliasExistsException],
      ['CodeMismatchException', CodeMismatchException],
      ['ExpiredCodeException', ExpiredCodeException],
      ['UserNotConfirmedException', UserNotConfirmedException],
      ['PasswordResetRequiredException', PasswordResetRequiredException],
      ['TooManyRequestsException', TooManyRequestsException],
      ['TooManyFailedAttemptsException', TooManyRequestsException],
      ['NetworkError', NetworkException],
    ];

    test.each(cases)('maps %s → %s', async (code, ErrorClass) => {
      mockUser.authenticateUser.mockImplementation(
        (_: unknown, cb: { onFailure: (err: unknown) => void }) => {
          cb.onFailure({ code, message: 'error' });
        },
      );
      await expect(repo.signIn('user@example.com', 'pass')).rejects.toThrow(
        ErrorClass,
      );
    });

    it('maps InvalidPasswordException with message', async () => {
      mockUser.authenticateUser.mockImplementation(
        (_: unknown, cb: { onFailure: (err: unknown) => void }) => {
          cb.onFailure({
            code: 'InvalidPasswordException',
            message: 'min length 8',
          });
        },
      );
      await expect(repo.signIn('user@example.com', 'pass')).rejects.toThrow(
        InvalidPasswordException,
      );
    });

    it('maps unknown codes to UnknownAuthException', async () => {
      mockUser.authenticateUser.mockImplementation(
        (_: unknown, cb: { onFailure: (err: unknown) => void }) => {
          cb.onFailure({ code: 'SomeFutureException', message: 'oops' });
        },
      );
      await expect(repo.signIn('user@example.com', 'pass')).rejects.toThrow(
        UnknownAuthException,
      );
    });

    it('maps null/non-object errors to UnknownAuthException', async () => {
      mockUser.authenticateUser.mockImplementation(
        (_: unknown, cb: { onFailure: (err: unknown) => void }) => {
          cb.onFailure(null);
        },
      );
      await expect(repo.signIn('user@example.com', 'pass')).rejects.toThrow(
        UnknownAuthException,
      );
    });
  });

  // ── signUp ──────────────────────────────────────────────────────────────────

  describe('signUp', () => {
    it('resolves on success', async () => {
      mockPool.signUp.mockImplementation(
        (
          _: unknown,
          __: unknown,
          ___: unknown,
          ____: unknown,
          cb: (err: null) => void,
        ) => {
          cb(null);
        },
      );

      await expect(
        repo.signUp({ email: 'user@example.com', password: 'Pass123!' }),
      ).resolves.toBeUndefined();
    });

    it('maps UsernameExistsException on duplicate email', async () => {
      mockPool.signUp.mockImplementation(
        (
          _: unknown,
          __: unknown,
          ___: unknown,
          ____: unknown,
          cb: (err: { code: string }) => void,
        ) => {
          cb({ code: 'UsernameExistsException' });
        },
      );

      await expect(
        repo.signUp({ email: 'user@example.com', password: 'Pass123!' }),
      ).rejects.toThrow(UsernameExistsException);
    });
  });

  // ── getCurrentUser ──────────────────────────────────────────────────────────

  describe('getCurrentUser', () => {
    it('returns null when pool has no current user', async () => {
      mockPool.getCurrentUser.mockReturnValue(null);
      await expect(repo.getCurrentUser()).resolves.toBeNull();
    });

    it('returns null when session is invalid', async () => {
      const invalidSession = { isValid: () => false };
      mockPool.getCurrentUser.mockReturnValue(mockUser);
      mockUser.getSession.mockImplementation(
        (cb: (err: null, session: unknown) => void) => {
          cb(null, invalidSession);
        },
      );

      await expect(repo.getCurrentUser()).resolves.toBeNull();
    });

    it('returns null on session error', async () => {
      mockPool.getCurrentUser.mockReturnValue(mockUser);
      mockUser.getSession.mockImplementation(
        (cb: (err: Error, session: null) => void) => {
          cb(new Error('expired'), null);
        },
      );

      await expect(repo.getCurrentUser()).resolves.toBeNull();
    });
  });

  // ── signOut ─────────────────────────────────────────────────────────────────

  describe('signOut', () => {
    it('resolves without error when no current user', async () => {
      mockPool.getCurrentUser.mockReturnValue(null);
      await expect(repo.signOut()).resolves.toBeUndefined();
    });

    it('calls globalSignOut on the current user', async () => {
      mockPool.getCurrentUser.mockReturnValue(mockUser);
      mockUser.globalSignOut.mockImplementation(
        (cb: { onSuccess: (msg: string) => void }) => {
          cb.onSuccess('SUCCESS');
        },
      );

      await repo.signOut();
      expect(mockUser.globalSignOut).toHaveBeenCalled();
    });

    it('falls back to local signOut when globalSignOut fails', async () => {
      mockPool.getCurrentUser.mockReturnValue(mockUser);
      mockUser.globalSignOut.mockImplementation(
        (cb: { onFailure: (err: Error) => void }) => {
          cb.onFailure(new Error('expired'));
        },
      );
      mockUser.signOut.mockImplementation((cb: () => void) => {
        cb();
      });

      await repo.signOut();
      expect(mockUser.signOut).toHaveBeenCalled();
    });
  });

  // ── decodeJwtPayload (via handleOAuthCallback) ───────────────────────────────

  describe('handleOAuthCallback', () => {
    const validPayload = { sub: 'user-abc' };
    const base64Payload = Buffer.from(JSON.stringify(validPayload)).toString(
      'base64',
    );
    const fakeAccessToken = `header.${base64Payload}.signature`;

    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: fakeAccessToken,
          id_token: 'id-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
        }),
      });
    });

    afterEach(() => {
      (global.fetch as jest.Mock).mockRestore?.();
    });

    it('exchanges code for session and maps userId from access token', async () => {
      const session = await repo.handleOAuthCallback(
        'auth-code',
        'verifier-123',
        'https://example.com/callback',
      );

      expect(session.accessToken).toBe(fakeAccessToken);
      expect(session.userId).toBe('user-abc');
      expect(session.refreshToken).toBe('refresh-token');
    });

    it('throws UnknownAuthException when token endpoint returns error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 400 });

      await expect(
        repo.handleOAuthCallback(
          'bad-code',
          'verifier',
          'https://example.com/callback',
        ),
      ).rejects.toThrow(UnknownAuthException);
    });
  });
});
