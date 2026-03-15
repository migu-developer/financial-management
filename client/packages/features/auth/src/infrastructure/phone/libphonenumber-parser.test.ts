import { LibPhoneNumberParser } from '@features/auth/infrastructure/phone/libphonenumber-parser';

const parser = new LibPhoneNumberParser();

describe('LibPhoneNumberParser.parse', () => {
  it('parses a valid Colombian number in E.164', () => {
    const result = parser.parse('+573001234567');
    expect(result).not.toBeNull();
    expect(result!.e164).toBe('+573001234567');
    expect(result!.countryCode).toBe('CO');
    expect(result!.dialCode).toBe('+57');
    expect(result!.number).toBe('3001234567');
  });

  it('parses a valid US number', () => {
    const result = parser.parse('+12025551234');
    expect(result).not.toBeNull();
    expect(result!.countryCode).toBe('US');
    expect(result!.dialCode).toBe('+1');
  });

  it('returns null for invalid number', () => {
    expect(parser.parse('12345')).toBeNull();
    expect(parser.parse('notanumber')).toBeNull();
    expect(parser.parse('')).toBeNull();
  });
});

describe('LibPhoneNumberParser.isValid', () => {
  it('returns true for valid E.164 number', () => {
    expect(parser.isValid('+573001234567')).toBe(true);
    expect(parser.isValid('+12025551234')).toBe(true);
  });

  it('returns false for invalid number', () => {
    expect(parser.isValid('12345')).toBe(false);
    expect(parser.isValid('abc')).toBe(false);
    expect(parser.isValid('')).toBe(false);
  });
});

describe('LibPhoneNumberParser.toE164', () => {
  it('converts Colombian national number to E.164', () => {
    const result = parser.toE164('3001234567', 'CO');
    expect(result).toBe('+573001234567');
  });

  it('returns null for invalid number', () => {
    expect(parser.toE164('12345', 'CO')).toBeNull();
  });

  it('keeps already valid E.164 number', () => {
    expect(parser.toE164('+12025551234')).toBe('+12025551234');
  });
});

describe('LibPhoneNumberParser.format', () => {
  it('formats a Colombian number as user types', () => {
    const result = parser.format('+573001234567', 'CO');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns input unchanged on invalid input', () => {
    const result = parser.format('abc');
    expect(result).toBe('abc');
  });
});
