import type { PreSignUpEvent } from '@pre-signup/types';

jest.mock('@aws-lambda-powertools/logger', () => ({
  Logger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn(),
}));

jest.mock('@user-sync/infrastructure/adapters/cognito-admin.adapter', () => ({
  CognitoAdminAdapter: jest.fn(),
}));

const mockTriggerHandler = jest.fn().mockResolvedValue('linked');

jest.mock('@pre-signup/infrastructure/adapters/trigger-handlers', () => ({
  TRIGGER_HANDLERS: {
    PreSignUp_ExternalProvider: (...args: unknown[]) =>
      mockTriggerHandler(...args),
  },
}));

import { handler } from './pre-signup';

function buildEvent(
  triggerSource: PreSignUpEvent['triggerSource'],
  userName: string,
): PreSignUpEvent {
  return {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'us-east-1_test',
    triggerSource,
    userName,
    callerContext: { awsSdkVersion: '3.0', clientId: 'test-client' },
    request: { userAttributes: { email: 'test@example.com' } },
    response: {
      autoConfirmUser: false,
      autoVerifyEmail: false,
      autoVerifyPhone: false,
    },
  };
}

beforeEach(() => jest.clearAllMocks());

describe('pre-signup handler', () => {
  it('dispatches ExternalProvider to trigger handler', async () => {
    const event = buildEvent('PreSignUp_ExternalProvider', 'Google_123');
    const result = await handler(event);
    expect(mockTriggerHandler).toHaveBeenCalledTimes(1);
    expect(result).toBe(event);
  });

  it('skips native SignUp', async () => {
    await handler(buildEvent('PreSignUp_SignUp', 'native-uuid'));
    expect(mockTriggerHandler).not.toHaveBeenCalled();
  });

  it('skips AdminCreateUser', async () => {
    await handler(buildEvent('PreSignUp_AdminCreateUser', 'admin'));
    expect(mockTriggerHandler).not.toHaveBeenCalled();
  });

  it('always returns the event', async () => {
    const event = buildEvent('PreSignUp_ExternalProvider', 'Google_123');
    expect(await handler(event)).toBe(event);
  });
});
