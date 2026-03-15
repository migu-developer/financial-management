import { Password } from '@features/auth/domain/value-objects/password';

describe('Password.validate', () => {
  it('returns all rules true for a strong password', () => {
    const result = Password.validate('SecureP@ss1');
    expect(result.isValid).toBe(true);
    expect(result.rules.minLength).toBe(true);
    expect(result.rules.hasUppercase).toBe(true);
    expect(result.rules.hasLowercase).toBe(true);
    expect(result.rules.hasNumber).toBe(true);
    expect(result.rules.hasSpecial).toBe(true);
  });

  it('fails minLength when less than 8 characters', () => {
    const result = Password.validate('Abc1@');
    expect(result.rules.minLength).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('fails hasUppercase when no uppercase letter', () => {
    const result = Password.validate('secure@pass1');
    expect(result.rules.hasUppercase).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('fails hasLowercase when no lowercase letter', () => {
    const result = Password.validate('SECURE@PASS1');
    expect(result.rules.hasLowercase).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('fails hasNumber when no digit', () => {
    const result = Password.validate('SecureP@ss');
    expect(result.rules.hasNumber).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('fails hasSpecial when no special character', () => {
    const result = Password.validate('SecurePass1');
    expect(result.rules.hasSpecial).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('returns false for empty string', () => {
    const result = Password.validate('');
    expect(result.isValid).toBe(false);
    expect(result.rules.minLength).toBe(false);
  });

  it('accepts all defined special characters', () => {
    const specials = '!@#$%^&*()_+-=[]{};\':"|,.<>/?';
    for (const char of specials) {
      const result = Password.validate(`SecureP${char}ss1`);
      expect(result.rules.hasSpecial).toBe(true);
    }
  });
});

describe('Password.isValid', () => {
  it('returns true for valid password', () => {
    expect(Password.isValid('SecureP@ss1')).toBe(true);
  });

  it('returns false for invalid password', () => {
    expect(Password.isValid('weak')).toBe(false);
  });
});
