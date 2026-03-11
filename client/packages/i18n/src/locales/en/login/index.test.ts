import { login } from './index';
import type { LoginTranslation } from './index';

describe('en/login namespace', () => {
  it('exports login as an object', () => {
    expect(login).toBeDefined();
    expect(typeof login).toBe('object');
  });

  it('has required sign-in keys', () => {
    expect(login).toHaveProperty('title');
    expect(login).toHaveProperty('emailLabel');
    expect(login).toHaveProperty('passwordLabel');
    expect(login).toHaveProperty('signInButton');
    expect(login).toHaveProperty('social');
  });

  it('has identifierInput section', () => {
    expect(login.identifierInput).toHaveProperty('label');
    expect(login.identifierInput).toHaveProperty('placeholder');
    expect(login.identifierInput).toHaveProperty('emailDetected');
    expect(login.identifierInput).toHaveProperty('phoneDetected');
    expect(login.identifierInput).toHaveProperty('invalidEmail');
    expect(login.identifierInput).toHaveProperty('invalidPhone');
    expect(login.identifierInput).toHaveProperty('invalidIdentifier');
  });

  it('has register section with all fields', () => {
    expect(login.register).toHaveProperty('title');
    expect(login.register).toHaveProperty('subtitle');
    expect(login.register).toHaveProperty('nameLabel');
    expect(login.register).toHaveProperty('emailLabel');
    expect(login.register).toHaveProperty('passwordLabel');
    expect(login.register).toHaveProperty('confirmPasswordLabel');
    expect(login.register).toHaveProperty('termsConsent');
    expect(login.register).toHaveProperty('submitButton');
    expect(login.register).toHaveProperty('passwordStrength');
    expect(login.register).toHaveProperty('passwordRequirements');
  });

  it('has confirmSignUp section', () => {
    expect(login.confirmSignUp).toHaveProperty('title');
    expect(login.confirmSignUp).toHaveProperty('subtitleEmail');
    expect(login.confirmSignUp).toHaveProperty('subtitlePhone');
    expect(login.confirmSignUp).toHaveProperty('codeLabel');
    expect(login.confirmSignUp).toHaveProperty('submitButton');
    expect(login.confirmSignUp).toHaveProperty('resendButton');
    expect(login.confirmSignUp).toHaveProperty('resendCooldown');
  });

  it('has newPassword section', () => {
    expect(login.newPassword).toHaveProperty('title');
    expect(login.newPassword).toHaveProperty('newPasswordLabel');
    expect(login.newPassword).toHaveProperty('confirmPasswordLabel');
    expect(login.newPassword).toHaveProperty('submitButton');
    expect(login.newPassword).toHaveProperty('passwordMismatch');
  });

  it('has mfaVerify section', () => {
    expect(login.mfaVerify).toHaveProperty('titleSms');
    expect(login.mfaVerify).toHaveProperty('titleTotp');
    expect(login.mfaVerify).toHaveProperty('subtitleSms');
    expect(login.mfaVerify).toHaveProperty('subtitleTotp');
    expect(login.mfaVerify).toHaveProperty('codeLabel');
    expect(login.mfaVerify).toHaveProperty('submitButton');
  });

  it('has mfaSetup section', () => {
    expect(login.mfaSetup).toHaveProperty('title');
    expect(login.mfaSetup).toHaveProperty('step1');
    expect(login.mfaSetup).toHaveProperty('step2');
    expect(login.mfaSetup).toHaveProperty('secretLabel');
    expect(login.mfaSetup).toHaveProperty('codeLabel');
    expect(login.mfaSetup).toHaveProperty('deviceNameLabel');
    expect(login.mfaSetup).toHaveProperty('submitButton');
  });

  it('has forgotPasswordPage section', () => {
    expect(login.forgotPasswordPage).toHaveProperty('title');
    expect(login.forgotPasswordPage).toHaveProperty('subtitle');
    expect(login.forgotPasswordPage).toHaveProperty('identifierLabel');
    expect(login.forgotPasswordPage).toHaveProperty('submitButton');
    expect(login.forgotPasswordPage).toHaveProperty('sentToEmail');
    expect(login.forgotPasswordPage).toHaveProperty('sentToPhone');
  });

  it('has confirmForgotPassword section', () => {
    expect(login.confirmForgotPassword).toHaveProperty('title');
    expect(login.confirmForgotPassword).toHaveProperty('codeLabel');
    expect(login.confirmForgotPassword).toHaveProperty('newPasswordLabel');
    expect(login.confirmForgotPassword).toHaveProperty('submitButton');
    expect(login.confirmForgotPassword).toHaveProperty('passwordMismatch');
  });

  it('has errors section covering all domain errors', () => {
    expect(login.errors).toHaveProperty('notAuthorized');
    expect(login.errors).toHaveProperty('userNotFound');
    expect(login.errors).toHaveProperty('usernameExists');
    expect(login.errors).toHaveProperty('aliasExists');
    expect(login.errors).toHaveProperty('codeMismatch');
    expect(login.errors).toHaveProperty('expiredCode');
    expect(login.errors).toHaveProperty('invalidPassword');
    expect(login.errors).toHaveProperty('userNotConfirmed');
    expect(login.errors).toHaveProperty('passwordResetRequired');
    expect(login.errors).toHaveProperty('tooManyRequests');
    expect(login.errors).toHaveProperty('networkError');
    expect(login.errors).toHaveProperty('unknown');
  });

  it('satisfies the LoginTranslation type', () => {
    const _typeCheck: LoginTranslation = login;
    expect(_typeCheck).toBe(login);
  });
});
