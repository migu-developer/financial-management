import { detectIdentifierType, IdentifierInput } from './index';

describe('IdentifierInput', () => {
  it('exports a function', () => {
    expect(typeof IdentifierInput).toBe('function');
  });

  it('has the expected name', () => {
    expect(IdentifierInput.name).toBe('IdentifierInput');
  });
});

describe('detectIdentifierType', () => {
  it('detects phone when value starts with +', () => {
    expect(detectIdentifierType('+573001234567')).toBe('phone');
  });

  it('detects phone when value is all digits (3+)', () => {
    expect(detectIdentifierType('3001234567')).toBe('phone');
  });

  it('detects email for email-like values', () => {
    expect(detectIdentifierType('user@example.com')).toBe('email');
  });

  it('returns email for empty string', () => {
    expect(detectIdentifierType('')).toBe('email');
  });

  it('returns email for partial email (no @)', () => {
    expect(detectIdentifierType('user')).toBe('email');
  });

  it('returns email for values with letters and digits', () => {
    expect(detectIdentifierType('user123')).toBe('email');
  });

  it('detects phone for + prefix even with spaces', () => {
    expect(detectIdentifierType('+57 300 123 4567')).toBe('phone');
  });
});
