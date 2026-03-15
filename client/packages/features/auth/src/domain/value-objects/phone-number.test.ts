import { PhoneNumber } from '@features/auth/domain/value-objects/phone-number';

describe('PhoneNumber.looksLikePhone', () => {
  it('returns true for international format', () => {
    expect(PhoneNumber.looksLikePhone('+573001234567')).toBe(true);
  });

  it('returns true for number with spaces', () => {
    expect(PhoneNumber.looksLikePhone('+57 300 123 4567')).toBe(true);
  });

  it('returns true for number with dashes', () => {
    expect(PhoneNumber.looksLikePhone('+1-800-555-0100')).toBe(true);
  });

  it('returns true for plain digits', () => {
    expect(PhoneNumber.looksLikePhone('3001234567')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(PhoneNumber.looksLikePhone('')).toBe(false);
  });

  it('returns false for email-like string', () => {
    expect(PhoneNumber.looksLikePhone('user@email.com')).toBe(false);
  });

  it('returns false for string too short', () => {
    expect(PhoneNumber.looksLikePhone('123')).toBe(false);
  });

  it('returns false for string too long', () => {
    expect(PhoneNumber.looksLikePhone('1'.repeat(25))).toBe(false);
  });
});
