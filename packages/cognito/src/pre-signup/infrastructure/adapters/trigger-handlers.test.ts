import type { CognitoAdminPort } from '@pre-signup/domain/ports/cognito-admin.port';
import type { PreSignUpEvent, PreSignUpTriggerSource } from '@pre-signup/types';
import { TRIGGER_HANDLERS } from './trigger-handlers';

function makePort(overrides: Partial<CognitoAdminPort> = {}): CognitoAdminPort {
  return {
    listUsersByEmail: jest.fn().mockResolvedValue([]),
    linkProviderToUser: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildEvent(
  triggerSource: PreSignUpTriggerSource,
  userName: string,
  email = 'test@example.com',
): PreSignUpEvent {
  return {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'us-east-1_test',
    triggerSource,
    userName,
    callerContext: { awsSdkVersion: '3.0', clientId: 'test-client' },
    request: { userAttributes: { email } },
    response: {
      autoConfirmUser: false,
      autoVerifyEmail: false,
      autoVerifyPhone: false,
    },
  };
}

describe('TRIGGER_HANDLERS', () => {
  it('has handlers for ExternalProvider and SignUp', () => {
    expect(TRIGGER_HANDLERS.PreSignUp_ExternalProvider).toBeDefined();
    expect(TRIGGER_HANDLERS.PreSignUp_SignUp).toBeDefined();
  });

  it('does not have handler for AdminCreateUser', () => {
    expect(TRIGGER_HANDLERS.PreSignUp_AdminCreateUser).toBeUndefined();
  });

  describe('PreSignUp_ExternalProvider', () => {
    const handle = TRIGGER_HANDLERS.PreSignUp_ExternalProvider!;

    it('sets autoConfirmUser and autoVerifyEmail', async () => {
      const event = buildEvent('PreSignUp_ExternalProvider', 'Google_123');
      await handle(event, makePort());

      expect(event.response.autoConfirmUser).toBe(true);
      expect(event.response.autoVerifyEmail).toBe(true);
    });

    it('links provider when native user exists', async () => {
      const port = makePort({
        listUsersByEmail: jest.fn().mockResolvedValue([
          {
            username: 'native-uuid',
            attributes: { email: 'test@example.com' },
            enabled: true,
            status: 'CONFIRMED',
          },
        ]),
      });
      const event = buildEvent(
        'PreSignUp_ExternalProvider',
        'Google_106895571745093657038',
      );
      const action = await handle(event, port);

      expect(action).toBe('linked');
      expect(port.linkProviderToUser).toHaveBeenCalledWith(
        'us-east-1_test',
        'native-uuid',
        'Google',
        '106895571745093657038',
      );
    });

    it('returns "skipped" when no native user exists', async () => {
      const event = buildEvent(
        'PreSignUp_ExternalProvider',
        'Facebook_987654321',
      );
      const action = await handle(event, makePort());

      expect(action).toBe('skipped');
    });

    it('returns "auto-confirmed" when provider cannot be parsed', async () => {
      const port = makePort();
      const event = buildEvent(
        'PreSignUp_ExternalProvider',
        'UnknownProvider_123',
      );
      const action = await handle(event, port);

      expect(action).toBe('auto-confirmed');
      expect(port.listUsersByEmail).not.toHaveBeenCalled();
    });
  });

  describe('PreSignUp_SignUp', () => {
    const handle = TRIGGER_HANDLERS.PreSignUp_SignUp!;

    it('links existing social providers to native user', async () => {
      const port = makePort({
        listUsersByEmail: jest.fn().mockResolvedValue([
          {
            username: 'Google_111',
            attributes: { email: 'test@example.com' },
            enabled: true,
            status: 'EXTERNAL_PROVIDER',
          },
        ]),
      });
      const event = buildEvent('PreSignUp_SignUp', 'native-uuid');
      const action = await handle(event, port);

      expect(action).toBe('linked-providers:Google');
      expect(port.linkProviderToUser).toHaveBeenCalledWith(
        'us-east-1_test',
        'native-uuid',
        'Google',
        '111',
      );
    });

    it('links multiple social providers', async () => {
      const port = makePort({
        listUsersByEmail: jest.fn().mockResolvedValue([
          {
            username: 'Google_111',
            attributes: {},
            enabled: true,
            status: 'EXTERNAL_PROVIDER',
          },
          {
            username: 'Facebook_222',
            attributes: {},
            enabled: true,
            status: 'EXTERNAL_PROVIDER',
          },
        ]),
      });
      const event = buildEvent('PreSignUp_SignUp', 'native-uuid');
      const action = await handle(event, port);

      expect(action).toBe('linked-providers:Google,Facebook');
      expect(port.linkProviderToUser).toHaveBeenCalledTimes(2);
    });

    it('returns "no-existing-providers" when no social users exist', async () => {
      const event = buildEvent('PreSignUp_SignUp', 'native-uuid');
      const action = await handle(event, makePort());

      expect(action).toBe('no-existing-providers');
    });

    it('does not set autoConfirm for native signup', async () => {
      const event = buildEvent('PreSignUp_SignUp', 'native-uuid');
      await handle(event, makePort());

      expect(event.response.autoConfirmUser).toBe(false);
    });
  });
});
