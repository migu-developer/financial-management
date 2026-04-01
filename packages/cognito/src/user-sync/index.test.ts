import type { CognitoUserSyncEvent } from './types';

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

jest.mock(
  '@services/shared/infrastructure/services/DatabaseServiceImp',
  () => ({
    PostgresDatabaseService: jest.fn().mockImplementation(() => ({
      query: jest.fn(),
      queryReadOnly: jest.fn(),
      end: jest.fn().mockResolvedValue(undefined),
    })),
  }),
);

jest.mock(
  '@services/users/infrastructure/repositories/postgres-user.repository',
  () => ({
    PostgresUserRepository: jest.fn(),
  }),
);

const mockTriggerHandler = jest.fn().mockResolvedValue('created');

jest.mock('@user-sync/infrastructure/adapters/trigger-handlers', () => ({
  TRIGGER_HANDLERS: {
    PostConfirmation_ConfirmSignUp: (...args: unknown[]) =>
      mockTriggerHandler(...args),
    PostAuthentication_Authentication: (...args: unknown[]) =>
      mockTriggerHandler(...args),
  },
}));

import { handler } from './index';

function buildEvent(
  triggerSource: CognitoUserSyncEvent['triggerSource'],
): CognitoUserSyncEvent {
  return {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'us-east-1_test',
    triggerSource,
    userName: 'test-user',
    callerContext: { awsSdkVersion: '3.0', clientId: 'test-client' },
    request: {
      userAttributes: {
        sub: 'a0000000-0000-0000-0000-000000000001',
        email: 'test@example.com',
      },
    },
    response: {},
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('user-sync handler', () => {
  it('dispatches PostConfirmation to trigger handler with deps', async () => {
    const event = buildEvent('PostConfirmation_ConfirmSignUp');
    const result = await handler(event);

    expect(mockTriggerHandler).toHaveBeenCalledTimes(1);
    expect(mockTriggerHandler).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        dbPort: expect.anything(),
        cognitoAdmin: expect.anything(),
      }),
    );
    expect(result).toBe(event);
  });

  it('dispatches PostAuthentication to trigger handler', async () => {
    const event = buildEvent('PostAuthentication_Authentication');
    await handler(event);
    expect(mockTriggerHandler).toHaveBeenCalledTimes(1);
  });

  it('skips unhandled triggers', async () => {
    const event = buildEvent('PostConfirmation_ConfirmForgotPassword');
    await handler(event);
    expect(mockTriggerHandler).not.toHaveBeenCalled();
  });

  it('always returns the event', async () => {
    const event = buildEvent('PostConfirmation_ConfirmSignUp');
    expect(await handler(event)).toBe(event);
  });
});
