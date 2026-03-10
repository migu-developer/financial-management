import { Identifier } from '@features/auth/domain/value-objects/identifier';

describe('Identifier.detect', () => {
  it('returns "email" when input contains @', () => {
    expect(Identifier.detect('user@email.com')).toBe('email');
  });

  it('returns "phone" when input starts with +', () => {
    expect(Identifier.detect('+573001234567')).toBe('phone');
  });

  it('returns "phone" when input starts with a digit', () => {
    expect(Identifier.detect('3001234567')).toBe('phone');
  });

  it('returns "unknown" for empty string', () => {
    expect(Identifier.detect('')).toBe('unknown');
  });

  it('returns "unknown" for whitespace only', () => {
    expect(Identifier.detect('   ')).toBe('unknown');
  });

  it('trims whitespace before detecting', () => {
    expect(Identifier.detect('  user@email.com  ')).toBe('email');
    expect(Identifier.detect('  +573001234567  ')).toBe('phone');
  });
});

describe('Identifier.isEmail', () => {
  it('returns true for valid email', () => {
    expect(Identifier.isEmail('user@example.com')).toBe(true);
    expect(Identifier.isEmail('user.name+tag@sub.domain.co')).toBe(true);
  });

  it('returns false for invalid email', () => {
    expect(Identifier.isEmail('notanemail')).toBe(false);
    expect(Identifier.isEmail('@nodomain')).toBe(false);
    expect(Identifier.isEmail('missing@')).toBe(false);
  });
});

describe('Identifier.isPhone', () => {
  it('returns true for phone-like strings', () => {
    expect(Identifier.isPhone('+573001234567')).toBe(true);
  });

  it('returns false for email', () => {
    expect(Identifier.isPhone('user@email.com')).toBe(false);
  });
});

describe('Identifier.parse', () => {
  it('normalizes email to lowercase', () => {
    const result = Identifier.parse('User@Email.COM');
    expect(result.type).toBe('email');
    expect(result.normalizedValue).toBe('user@email.com');
    expect(result.value).toBe('User@Email.COM');
  });

  it('returns trimmed phone value without E.164 normalization', () => {
    const result = Identifier.parse('  +573001234567  ');
    expect(result.type).toBe('phone');
    expect(result.normalizedValue).toBe('+573001234567');
    expect(result.value).toBe('+573001234567');
  });

  it('returns unknown type with trimmed value for unrecognized input', () => {
    const result = Identifier.parse('  something  ');
    expect(result.type).toBe('unknown');
    expect(result.normalizedValue).toBe('something');
  });
});
