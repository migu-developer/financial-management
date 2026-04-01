import type { CognitoAdminPort } from '@pre-signup/domain/ports/cognito-admin.port';
import type { PreSignUpEvent } from '@pre-signup/types';
import { TRIGGER_HANDLERS } from './trigger-handlers';

function makePort(overrides: Partial<CognitoAdminPort> = {}): CognitoAdminPort {
  return {
    listUsersByEmail: jest.fn().mockResolvedValue([]),
    linkProviderToUser: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildEvent(
  userName: string,
  email = 'test@example.com',
): PreSignUpEvent {
  return {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'us-east-1_test',
    triggerSource: 'PreSignUp_ExternalProvider',
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
  it('has handler for PreSignUp_ExternalProvider only', () => {
    expect(TRIGGER_HANDLERS.PreSignUp_ExternalProvider).toBeDefined();
    expect(TRIGGER_HANDLERS.PreSignUp_SignUp).toBeUndefined();
    expect(TRIGGER_HANDLERS.PreSignUp_AdminCreateUser).toBeUndefined();
  });

  describe('PreSignUp_ExternalProvider', () => {
    const handle = TRIGGER_HANDLERS.PreSignUp_ExternalProvider!;

    it('sets autoConfirmUser and autoVerifyEmail', async () => {
      const event = buildEvent('Google_123');
      const port = makePort();
      await handle(event, port);

      expect(event.response.autoConfirmUser).toBe(true);
      expect(event.response.autoVerifyEmail).toBe(true);
    });

    it('links provider when native user exists and returns "linked"', async () => {
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
      const event = buildEvent('Google_106895571745093657038');
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
      const port = makePort();
      const event = buildEvent('Facebook_987654321');
      const action = await handle(event, port);

      expect(action).toBe('skipped');
      expect(port.linkProviderToUser).not.toHaveBeenCalled();
    });

    it('returns "auto-confirmed" when provider cannot be parsed', async () => {
      const port = makePort();
      const event = buildEvent('UnknownProvider_123');
      const action = await handle(event, port);

      expect(action).toBe('auto-confirmed');
      expect(port.listUsersByEmail).not.toHaveBeenCalled();
    });

    it('still sets autoConfirm when provider cannot be parsed', async () => {
      const port = makePort();
      const event = buildEvent('UnknownProvider_123');
      await handle(event, port);

      expect(event.response.autoConfirmUser).toBe(true);
      expect(event.response.autoVerifyEmail).toBe(true);
    });

    it('propagates errors', async () => {
      const port = makePort({
        listUsersByEmail: jest
          .fn()
          .mockRejectedValue(new Error('Cognito down')),
      });
      const event = buildEvent('Google_123');
      await expect(handle(event, port)).rejects.toThrow('Cognito down');
    });
  });
});
