import { parseExternalProvider } from './provider-parser';

describe('parseExternalProvider', () => {
  it('parses Google provider', () => {
    const result = parseExternalProvider('Google_106895571745093657038');
    expect(result).toEqual({
      name: 'Google',
      userId: '106895571745093657038',
    });
  });

  it('parses Facebook provider', () => {
    const result = parseExternalProvider('Facebook_987654321');
    expect(result).toEqual({ name: 'Facebook', userId: '987654321' });
  });

  it('parses Apple provider', () => {
    const result = parseExternalProvider('SignInWithApple_000123.abc.def');
    expect(result).toEqual({
      name: 'SignInWithApple',
      userId: '000123.abc.def',
    });
  });

  it('parses Microsoft provider', () => {
    const result = parseExternalProvider('Microsoft_abc-def-123');
    expect(result).toEqual({ name: 'Microsoft', userId: 'abc-def-123' });
  });

  it('returns null for native Cognito user (UUID)', () => {
    const result = parseExternalProvider(
      '6438f488-50a1-700d-f882-63b372f4f772',
    );
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseExternalProvider('')).toBeNull();
  });

  it('returns null for unknown provider prefix', () => {
    expect(parseExternalProvider('Twitter_12345')).toBeNull();
  });
});
