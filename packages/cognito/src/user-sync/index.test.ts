import type { CognitoUserSyncEvent } from './types';

const mockCreate = jest.fn().mockResolvedValue({ id: 'user-1' });
const mockPatch = jest.fn().mockResolvedValue({ id: 'user-1' });
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

jest.mock('@services/users/application/use-cases/create-user.use-case', () => ({
  CreateUserUseCase: jest.fn().mockImplementation(() => ({
    execute: mockCreate,
  })),
}));

jest.mock('@services/users/application/use-cases/patch-user.use-case', () => ({
  PatchUserUseCase: jest.fn().mockImplementation(() => ({
    execute: mockPatch,
  })),
}));

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
    it('calls CreateUserUseCase with mapped input', async () => {
      const event = buildEvent('PostConfirmation_ConfirmSignUp');
      const result = await handler(event);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'a0000000-0000-0000-0000-000000000001',
          email: 'test@example.com',
          first_name: 'Miguel',
        }),
        'test@example.com',
      );
      expect(result).toBe(event);
    });

    it('does not call PatchUserUseCase', async () => {
      await handler(buildEvent('PostConfirmation_ConfirmSignUp'));
      expect(mockPatch).not.toHaveBeenCalled();
    });
  });

  describe('PostAuthentication_Authentication', () => {
    it('calls PatchUserUseCase with mapped input', async () => {
      const event = buildEvent('PostAuthentication_Authentication');
      const result = await handler(event);

      expect(mockPatch).toHaveBeenCalledTimes(1);
      expect(mockPatch).toHaveBeenCalledWith(
        'a0000000-0000-0000-0000-000000000001',
        expect.objectContaining({
          first_name: 'Miguel',
          last_name: 'Gutierrez',
          locale: 'en',
        }),
        'test@example.com',
      );
      expect(result).toBe(event);
    });

    it('does not call CreateUserUseCase', async () => {
      await handler(buildEvent('PostAuthentication_Authentication'));
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('PostConfirmation_ConfirmForgotPassword', () => {
    it('does not call create or patch', async () => {
      await handler(buildEvent('PostConfirmation_ConfirmForgotPassword'));
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockPatch).not.toHaveBeenCalled();
    });
  });

  describe('lifecycle', () => {
    it('always returns the original event', async () => {
      const event = buildEvent('PostConfirmation_ConfirmSignUp');
      const result = await handler(event);
      expect(result).toBe(event);
    });

    it('always calls dbService.end() even on success', async () => {
      await handler(buildEvent('PostConfirmation_ConfirmSignUp'));
      expect(mockEnd).toHaveBeenCalledTimes(1);
    });

    it('always calls dbService.end() on error and rethrows', async () => {
      mockCreate.mockRejectedValueOnce(new Error('DB down'));
      const event = buildEvent('PostConfirmation_ConfirmSignUp');
      await expect(handler(event)).rejects.toThrow('DB down');
      expect(mockEnd).toHaveBeenCalledTimes(1);
    });
  });
});
