import type { UserSyncPort } from '@user-sync/domain/ports/user-sync.port';
import type { CognitoAdminPort } from '@user-sync/domain/ports/cognito-admin.port';
import type { UserProfile } from '@packages/models/users/types';
import type { CognitoUserSyncEvent } from '@user-sync/types';
import { TRIGGER_HANDLERS, type TriggerDeps } from './trigger-handlers';

const mockUser: UserProfile = {
  id: 'user-1',
  uid: 'native-sub-001',
  email: 'test@example.com',
  first_name: 'Miguel',
  last_name: 'Gutierrez',
  identities: null,
  locale: 'en',
  picture: null,
  phone: null,
  document_id: null,
  email_verified: false,
  phone_verified: false,
  provider_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'test@example.com',
  modified_by: 'test@example.com',
};

function buildEvent(
  triggerSource: CognitoUserSyncEvent['triggerSource'],
  userName = 'native-uuid',
  sub = 'native-sub-001',
): CognitoUserSyncEvent {
  return {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'us-east-1_test',
    triggerSource,
    userName,
    callerContext: { awsSdkVersion: '3.0', clientId: 'test-client' },
    request: {
      userAttributes: {
        sub,
        email: 'test@example.com',
        given_name: 'Miguel',
        family_name: 'Gutierrez',
        locale: 'en',
      },
    },
    response: {},
  };
}

function makeDeps(
  dbOverrides: Partial<UserSyncPort> = {},
  cognitoOverrides: Partial<CognitoAdminPort> = {},
): TriggerDeps {
  return {
    dbPort: {
      findByUid: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockUser),
      patch: jest.fn().mockResolvedValue(mockUser),
      updateUid: jest.fn().mockResolvedValue(mockUser),
      ...dbOverrides,
    },
    cognitoAdmin: {
      listUsersByEmail: jest.fn().mockResolvedValue([]),
      linkProviderToUser: jest.fn().mockResolvedValue(undefined),
      ...cognitoOverrides,
    },
  };
}

describe('TRIGGER_HANDLERS', () => {
  it('has handlers for PostConfirmation and PostAuthentication', () => {
    expect(TRIGGER_HANDLERS.PostConfirmation_ConfirmSignUp).toBeDefined();
    expect(TRIGGER_HANDLERS.PostAuthentication_Authentication).toBeDefined();
    expect(
      TRIGGER_HANDLERS.PostConfirmation_ConfirmForgotPassword,
    ).toBeUndefined();
  });

  describe('PostConfirmation_ConfirmSignUp', () => {
    const handle = TRIGGER_HANDLERS.PostConfirmation_ConfirmSignUp!;

    describe('native signup', () => {
      it('creates user in DB when no one exists', async () => {
        const deps = makeDeps();
        const event = buildEvent('PostConfirmation_ConfirmSignUp');
        const action = await handle(event, deps);

        expect(deps.dbPort.findByEmail).toHaveBeenCalledWith(
          'test@example.com',
        );
        expect(deps.dbPort.create).toHaveBeenCalled();
        expect(action).toContain('created');
      });

      it('updates uid when social user already exists in DB', async () => {
        const deps = makeDeps({
          findByEmail: jest.fn().mockResolvedValue({
            ...mockUser,
            uid: 'old-social-sub',
          }),
        });
        const event = buildEvent(
          'PostConfirmation_ConfirmSignUp',
          'native-uuid',
          'new-native-sub',
        );
        const action = await handle(event, deps);

        expect(deps.dbPort.updateUid).toHaveBeenCalledWith(
          'test@example.com',
          'new-native-sub',
          'test@example.com',
        );
        expect(deps.dbPort.create).not.toHaveBeenCalled();
        expect(action).toContain('uid-updated');
      });

      it('links existing social accounts in Cognito', async () => {
        const deps = makeDeps(
          {},
          {
            listUsersByEmail: jest.fn().mockResolvedValue([
              {
                username: 'Google_111',
                attributes: {},
                enabled: true,
                status: 'EXTERNAL_PROVIDER',
              },
            ]),
          },
        );
        const event = buildEvent('PostConfirmation_ConfirmSignUp');
        const action = await handle(event, deps);

        expect(deps.cognitoAdmin.linkProviderToUser).toHaveBeenCalledWith(
          'us-east-1_test',
          'native-uuid',
          'Google',
          '111',
        );
        expect(action).toContain('linked:Google');
      });
    });

    describe('social signup', () => {
      it('creates user in DB when no one exists', async () => {
        const deps = makeDeps();
        const event = buildEvent(
          'PostConfirmation_ConfirmSignUp',
          'Google_111',
          'social-sub',
        );
        const action = await handle(event, deps);

        expect(deps.dbPort.create).toHaveBeenCalled();
        expect(action).toBe('created');
      });

      it('links to native in Cognito when native exists in DB', async () => {
        const deps = makeDeps(
          {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          {
            listUsersByEmail: jest.fn().mockResolvedValue([
              {
                username: 'native-uuid',
                attributes: {},
                enabled: true,
                status: 'CONFIRMED',
              },
              {
                username: 'Google_111',
                attributes: {},
                enabled: true,
                status: 'EXTERNAL_PROVIDER',
              },
            ]),
          },
        );
        const event = buildEvent(
          'PostConfirmation_ConfirmSignUp',
          'Google_111',
          'social-sub',
        );
        const action = await handle(event, deps);

        expect(deps.dbPort.create).not.toHaveBeenCalled();
        expect(action).toContain('linked-to-native');
      });

      it('skips linking when native not in Cognito', async () => {
        const deps = makeDeps(
          {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
          {
            listUsersByEmail: jest.fn().mockResolvedValue([
              {
                username: 'Google_111',
                attributes: {},
                enabled: true,
                status: 'EXTERNAL_PROVIDER',
              },
            ]),
          },
        );
        const event = buildEvent(
          'PostConfirmation_ConfirmSignUp',
          'Google_111',
          'social-sub',
        );
        const action = await handle(event, deps);

        expect(action).toBe('native-not-in-cognito');
      });
    });
  });

  describe('PostAuthentication_Authentication', () => {
    const handle = TRIGGER_HANDLERS.PostAuthentication_Authentication!;

    it('patches user when found by uid', async () => {
      const deps = makeDeps({
        findByUid: jest.fn().mockResolvedValue(mockUser),
      });
      const event = buildEvent('PostAuthentication_Authentication');
      const action = await handle(event, deps);

      expect(deps.dbPort.patch).toHaveBeenCalled();
      expect(action).toBe('updated');
    });

    it('migrates uid and patches when found by email only', async () => {
      const deps = makeDeps({
        findByUid: jest.fn().mockResolvedValue(null),
        findByEmail: jest.fn().mockResolvedValue({
          ...mockUser,
          uid: 'old-sub',
        }),
      });
      const event = buildEvent(
        'PostAuthentication_Authentication',
        'Google_111',
        'new-sub',
      );
      const action = await handle(event, deps);

      expect(deps.dbPort.updateUid).toHaveBeenCalledWith(
        'test@example.com',
        'new-sub',
        'test@example.com',
      );
      expect(deps.dbPort.patch).toHaveBeenCalled();
      expect(action).toBe('uid-migrated+updated');
    });

    it('creates user when not found at all', async () => {
      const deps = makeDeps();
      const event = buildEvent('PostAuthentication_Authentication');
      const action = await handle(event, deps);

      expect(deps.dbPort.create).toHaveBeenCalled();
      expect(action).toBe('created');
    });
  });
});
