import { login } from './index';
import type { LoginTranslation } from './index';

describe('en/login namespace', () => {
  it('exports login as an object', () => {
    expect(login).toBeDefined();
    expect(typeof login).toBe('object');
  });

  it('is an empty namespace ready for translations', () => {
    expect(Object.keys(login)).toHaveLength(0);
  });

  it('satisfies the LoginTranslation type', () => {
    const _typeCheck: LoginTranslation = login;
    expect(_typeCheck).toBe(login);
  });
});
