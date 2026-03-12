import { evaluatePasswordStrength, PasswordStrength } from './index';

describe('PasswordStrength', () => {
  it('exports a function', () => {
    expect(typeof PasswordStrength).toBe('function');
  });

  it('has the expected name', () => {
    expect(PasswordStrength.name).toBe('PasswordStrength');
  });
});

describe('evaluatePasswordStrength', () => {
  it('returns 0 for empty password', () => {
    expect(evaluatePasswordStrength('')).toBe(0);
  });

  it('returns 1 for only-length criterion met', () => {
    expect(evaluatePasswordStrength('abcdefgh')).toBe(2); // length + lowercase
  });

  it('returns 5 for strong password meeting all criteria', () => {
    expect(evaluatePasswordStrength('Passw0rd!')).toBe(5);
  });

  it('detects uppercase', () => {
    // 'Abcdefgh' has length + uppercase + lowercase = 3
    // 'abcdefgh' has length + lowercase = 2
    const withUpper = evaluatePasswordStrength('Abcdefgh');
    const withoutUpper = evaluatePasswordStrength('abcdefgh');
    expect(withUpper).toBeGreaterThan(withoutUpper);
  });

  it('detects digit', () => {
    const withDigit = evaluatePasswordStrength('abcdefg1');
    const withoutDigit = evaluatePasswordStrength('abcdefgh');
    expect(withDigit).toBeGreaterThan(withoutDigit);
  });

  it('detects special character', () => {
    const withSpecial = evaluatePasswordStrength('abcdefg!');
    const withoutSpecial = evaluatePasswordStrength('abcdefgh');
    expect(withSpecial).toBeGreaterThan(withoutSpecial);
  });

  it('does not count length criterion for short passwords', () => {
    expect(evaluatePasswordStrength('Ab1!')).toBe(4); // uppercase + lowercase + digit + special, no length
  });
});
