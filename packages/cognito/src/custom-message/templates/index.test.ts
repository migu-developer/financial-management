import { resolveLocale, getMessages } from './index';
import type { CustomMessageTriggerSource } from '@custom-message/types';

describe('resolveLocale', () => {
  it('returns "en" when localeAttr is undefined', () => {
    expect(resolveLocale(undefined)).toBe('en');
  });

  it('returns "en" when localeAttr is empty string', () => {
    expect(resolveLocale('')).toBe('en');
  });

  it('returns "en" for "en"', () => {
    expect(resolveLocale('en')).toBe('en');
  });

  it('returns "es" for "es"', () => {
    expect(resolveLocale('es')).toBe('es');
  });

  it('returns "es" for "es-ES" (uses first segment)', () => {
    expect(resolveLocale('es-ES')).toBe('es');
  });

  it('returns "en" for "en_US"', () => {
    expect(resolveLocale('en_US')).toBe('en');
  });

  it('returns default "en" for unsupported locale', () => {
    expect(resolveLocale('fr')).toBe('en');
    expect(resolveLocale('de')).toBe('en');
  });
});

describe('getMessages', () => {
  const triggers: CustomMessageTriggerSource[] = [
    'CustomMessage_SignUp',
    'CustomMessage_AdminCreateUser',
    'CustomMessage_ResendCode',
    'CustomMessage_ForgotPassword',
    'CustomMessage_UpdateUserAttribute',
    'CustomMessage_VerifyUserAttribute',
  ];

  it('returns en messages with emailSubject and smsMessage for every trigger', () => {
    const messages = getMessages('en');
    for (const trigger of triggers) {
      const content = messages[trigger];
      expect(content).toBeDefined();
      expect(content.emailSubject).toBeDefined();
      expect(typeof content.emailSubject).toBe('string');
      expect(content.smsMessage).toBeDefined();
      expect(content.smsMessage).toContain('{####}');
    }
  });

  it('returns es messages with emailSubject and smsMessage for every trigger', () => {
    const messages = getMessages('es');
    for (const trigger of triggers) {
      const content = messages[trigger];
      expect(content).toBeDefined();
      expect(content.emailSubject).toBeDefined();
      expect(content.smsMessage).toBeDefined();
      expect(content.smsMessage).toContain('{####}');
    }
  });

  it('AdminCreateUser sms contains {username} and {####}', () => {
    expect(
      getMessages('en').CustomMessage_AdminCreateUser.smsMessage,
    ).toContain('{username}');
    expect(
      getMessages('en').CustomMessage_AdminCreateUser.smsMessage,
    ).toContain('{####}');
    expect(
      getMessages('es').CustomMessage_AdminCreateUser.smsMessage,
    ).toContain('{username}');
    expect(
      getMessages('es').CustomMessage_AdminCreateUser.smsMessage,
    ).toContain('{####}');
  });
});
