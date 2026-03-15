import type { AuthRepository } from '@features/auth/domain/repositories/auth-repository.port';

export function createMockAuthRepository(): jest.Mocked<AuthRepository> {
  return {
    signIn: jest.fn(),
    respondToNewPasswordChallenge: jest.fn(),
    respondToMfaChallenge: jest.fn(),
    signUp: jest.fn(),
    confirmSignUp: jest.fn(),
    resendConfirmationCode: jest.fn(),
    getOAuthSignInUrl: jest.fn(),
    handleOAuthCallback: jest.fn(),
    initiateForgotPassword: jest.fn(),
    confirmForgotPassword: jest.fn(),
    associateSoftwareToken: jest.fn(),
    verifySoftwareToken: jest.fn(),
    getCurrentUser: jest.fn(),
    refreshSession: jest.fn(),
    signOut: jest.fn(),
  };
}
