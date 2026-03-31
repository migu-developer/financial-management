import type { CognitoUserSyncEvent } from './types';

jest.mock('@aws-lambda-powertools/logger', () => ({
  Logger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockSignupExecute = jest
  .fn()
  .mockResolvedValue({ action: 'created', user: { id: 'user-1' } });
const mockLoginExecute = jest
  .fn()
  .mockResolvedValue({ action: 'updated', user: { id: 'user-1' } });
const mockEnd = jest.fn().mockResolvedValue(undefined);

jest.mock(
  '@services/shared/infrastructure/services/DatabaseServiceImp',
  () => ({
    PostgresDatabaseService: jest.fn().mockImplementation(() => ({
      query: jest.fn(),
      queryReadOnly: jest.fn(),
      end: mockEnd,
    })),
  }),
);

jest.mock(
  '@services/users/infrastructure/repositories/postgres-user.repository',
  () => ({
    PostgresUserRepository: jest.fn(),
  }),
);

jest.mock(
  '@user-sync/application/use-cases/sync-user-on-signup.use-case',
  () => ({
    SyncUserOnSignupUseCase: jest.fn().mockImplementation(() => ({
      execute: mockSignupExecute,
    })),
  }),
);

jest.mock(
  '@user-sync/application/use-cases/sync-user-on-login.use-case',
  () => ({
    SyncUserOnLoginUseCase: jest.fn().mockImplementation(() => ({
      execute: mockLoginExecute,
    })),
  }),
);

import { handler } from './index';

function buildEvent(
  triggerSource: CognitoUserSyncEvent['triggerSource'],
  attrs: Record<string, string> = {},
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
        given_name: 'Miguel',
        family_name: 'Gutierrez',
        locale: 'en',
        ...attrs,
      },
    },
    response: {},
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('user-sync handler', () => {
  describe('PostConfirmation_ConfirmSignUp', () => {
    it('dispatches to SyncUserOnSignupUseCase via trigger map', async () => {
      const event = buildEvent('PostConfirmation_ConfirmSignUp');
      const result = await handler(event);

      expect(mockSignupExecute).toHaveBeenCalledTimes(1);
      expect(mockSignupExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'a0000000-0000-0000-0000-000000000001',
          email: 'test@example.com',
        }),
        'test@example.com',
      );
      expect(mockLoginExecute).not.toHaveBeenCalled();
      expect(result).toBe(event);
    });
  });

  describe('PostAuthentication_Authentication', () => {
    it('dispatches to SyncUserOnLoginUseCase via trigger map', async () => {
      const event = buildEvent('PostAuthentication_Authentication');
      const result = await handler(event);

      expect(mockLoginExecute).toHaveBeenCalledTimes(1);
      expect(mockLoginExecute).toHaveBeenCalledWith(
        'a0000000-0000-0000-0000-000000000001',
        expect.objectContaining({
          uid: 'a0000000-0000-0000-0000-000000000001',
        }),
        expect.objectContaining({ first_name: 'Miguel' }),
        'test@example.com',
      );
      expect(mockSignupExecute).not.toHaveBeenCalled();
      expect(result).toBe(event);
    });
  });

  describe('unhandled trigger sources', () => {
    it('skips PostConfirmation_ConfirmForgotPassword', async () => {
      const event = buildEvent('PostConfirmation_ConfirmForgotPassword');
      const result = await handler(event);

      expect(mockSignupExecute).not.toHaveBeenCalled();
      expect(mockLoginExecute).not.toHaveBeenCalled();
      expect(result).toBe(event);
    });

    it('does not create repository for unhandled triggers', async () => {
      await handler(buildEvent('PostConfirmation_ConfirmForgotPassword'));
      const { PostgresUserRepository } = jest.requireMock(
        '@services/users/infrastructure/repositories/postgres-user.repository',
      ) as { PostgresUserRepository: jest.Mock };
      expect(PostgresUserRepository).not.toHaveBeenCalled();
    });
  });

  describe('lifecycle', () => {
    it('always returns the original event', async () => {
      const event = buildEvent('PostConfirmation_ConfirmSignUp');
      expect(await handler(event)).toBe(event);
    });

    it('always calls dbService.end()', async () => {
      await handler(buildEvent('PostConfirmation_ConfirmSignUp'));
      expect(mockEnd).toHaveBeenCalledTimes(1);
    });

    it('calls dbService.end() on error and rethrows', async () => {
      mockSignupExecute.mockRejectedValueOnce(new Error('DB down'));
      await expect(
        handler(buildEvent('PostConfirmation_ConfirmSignUp')),
      ).rejects.toThrow('DB down');
      expect(mockEnd).toHaveBeenCalledTimes(1);
    });
  });
});
