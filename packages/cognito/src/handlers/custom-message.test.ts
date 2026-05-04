jest.mock('@aws-lambda-powertools/tracer', () => ({
  Tracer: jest.fn(() => ({
    annotateColdStart: jest.fn(),
    captureAWSv3Client: jest.fn((client: unknown) => client),
  })),
}));

import { handler } from './custom-message';
import type {
  CustomMessageTriggerEvent,
  LocaleMessages,
  MessageContent,
} from '@custom-message/types';
import {
  resolveLocale,
  getMessages,
  getEmailHtmlFromS3,
} from '@custom-message/templates/index';

jest.mock('@aws-lambda-powertools/logger', () => ({
  Logger: jest.fn(() => ({
    addContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('@custom-message/templates/index', () => ({
  resolveLocale: jest.fn(),
  getMessages: jest.fn(),
  getEmailHtmlFromS3: jest.fn(),
  TRIGGER_TO_TEMPLATE: {
    CustomMessage_SignUp: 'account-verification',
    CustomMessage_AdminCreateUser: 'admin-invitation',
    CustomMessage_ResendCode: 'resend-verification-code',
    CustomMessage_ForgotPassword: 'password-reset',
    CustomMessage_UpdateUserAttribute: 'account-update-verification',
    CustomMessage_VerifyUserAttribute: 'attribute-verification',
    CustomMessage_Authentication: 'mfa-authentication',
  },
}));

const mockResolveLocale = resolveLocale as jest.MockedFunction<
  typeof resolveLocale
>;
const mockGetMessages = getMessages as jest.MockedFunction<typeof getMessages>;
const mockGetEmailHtmlFromS3 = getEmailHtmlFromS3 as jest.MockedFunction<
  typeof getEmailHtmlFromS3
>;

function baseEvent(
  triggerSource: CustomMessageTriggerEvent['triggerSource'],
): CustomMessageTriggerEvent {
  return {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'pool-1',
    triggerSource,
    userName: 'user-1',
    callerContext: { awsSdkVersion: '1', clientId: 'client-1' },
    request: {
      userAttributes: { locale: 'en' },
      codeParameter: '123456',
      usernameParameter: 'john',
    },
    response: {
      smsMessage: null,
      emailMessage: null,
      emailSubject: null,
    },
  };
}

describe('handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveLocale.mockReturnValue('en');
    mockGetMessages.mockReturnValue({
      CustomMessage_SignUp: {
        emailSubject: 'Verify your account',
        smsMessage: 'Your code is: {####}',
      },
      CustomMessage_AdminCreateUser: {
        emailSubject: 'Welcome',
        smsMessage: 'Username: {username}, password: {####}',
      },
      CustomMessage_ResendCode: {
        emailSubject: 'New code',
        smsMessage: 'New code: {####}',
      },
      CustomMessage_ForgotPassword: {
        emailSubject: 'Reset password',
        smsMessage: 'Reset code: {####}',
      },
      CustomMessage_UpdateUserAttribute: {
        emailSubject: 'Verify change',
        smsMessage: 'Code: {####}',
      },
      CustomMessage_VerifyUserAttribute: {
        emailSubject: 'Verify attribute',
        smsMessage: 'Code: {####}',
      },
      CustomMessage_Authentication: {
        emailSubject: 'Sign-in code',
        smsMessage: 'Sign-in code: {####}',
      },
    });
    mockGetEmailHtmlFromS3.mockResolvedValue('<html>Email body</html>');
  });

  it('sets emailSubject, emailMessage from S3, and smsMessage for SignUp', async () => {
    const event = baseEvent('CustomMessage_SignUp');
    const out = await handler(event);
    expect(mockResolveLocale).toHaveBeenCalledWith('en');
    expect(mockGetEmailHtmlFromS3).toHaveBeenCalledWith(
      expect.anything(),
      'en',
      'account-verification',
    );
    expect(out.response.emailSubject).toBe('Verify your account');
    expect(out.response.emailMessage).toBe('<html>Email body</html>');
    expect(out.response.smsMessage).toBe('Your code is: {####}');
  });

  it('sets SMS message for AdminCreateUser', async () => {
    const event = baseEvent('CustomMessage_AdminCreateUser');
    const out = await handler(event);
    expect(out.response.smsMessage).toBe(
      'Username: {username}, password: {####}',
    );
  });

  it('throws when getEmailHtmlFromS3 returns null', async () => {
    mockGetEmailHtmlFromS3.mockResolvedValue(null);
    const event = baseEvent('CustomMessage_SignUp');
    await expect(handler(event)).rejects.toThrow(
      /email template not found in S3/,
    );
  });

  it('returns event unchanged when getMessages returns no content for trigger', async () => {
    const messagesWithMissing: LocaleMessages = {
      CustomMessage_SignUp: { emailSubject: 'x', smsMessage: 'y' },
      CustomMessage_AdminCreateUser: { emailSubject: 'x', smsMessage: 'y' },
      CustomMessage_ResendCode: { emailSubject: 'x', smsMessage: 'y' },
      CustomMessage_ForgotPassword: { emailSubject: 'x', smsMessage: 'y' },
      CustomMessage_UpdateUserAttribute: { emailSubject: 'x', smsMessage: 'y' },
      CustomMessage_VerifyUserAttribute: null as unknown as MessageContent,
      CustomMessage_Authentication: { emailSubject: 'x', smsMessage: 'y' },
    };
    mockGetMessages.mockReturnValue(messagesWithMissing);
    const event = baseEvent('CustomMessage_VerifyUserAttribute');
    const out = await handler(event);
    expect(out).toBe(event);
    expect(out.response.emailSubject).toBeNull();
    expect(mockGetEmailHtmlFromS3).not.toHaveBeenCalled();
  });
});
