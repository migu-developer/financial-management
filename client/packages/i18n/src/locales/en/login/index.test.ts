import { login } from './index';
import type { LoginTranslation } from './index';

describe('en/login namespace', () => {
  it('exports login as an object', () => {
    expect(login).toBeDefined();
    expect(typeof login).toBe('object');
  });

  it('has required top-level keys', () => {
    expect(login).toHaveProperty('title');
    expect(login).toHaveProperty('emailLabel');
    expect(login).toHaveProperty('passwordLabel');
    expect(login).toHaveProperty('signInButton');
    expect(login).toHaveProperty('social');
    expect(login).toHaveProperty('register');
    expect(login).toHaveProperty('forgotPasswordPage');
  });

  it('satisfies the LoginTranslation type', () => {
    const _typeCheck: LoginTranslation = login;
    expect(_typeCheck).toBe(login);
  });
});
