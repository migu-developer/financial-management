import { mapToCreateInput, mapToPatchInput } from './cognito-user.mapper';

const fullAttributes: Record<string, string> = {
  sub: 'a0000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  given_name: 'Miguel',
  family_name: 'Gutierrez',
  locale: 'en',
  picture: 'https://example.com/photo.jpg',
  phone_number: '+573001234567',
  identities:
    '[{"providerName":"Google","userId":"123","providerType":"Google"}]',
  email_verified: 'true',
};

describe('mapToCreateInput', () => {
  it('maps all available attributes', () => {
    const input = mapToCreateInput(fullAttributes);
    expect(input.uid).toBe('a0000000-0000-0000-0000-000000000001');
    expect(input.email).toBe('test@example.com');
    expect(input.first_name).toBe('Miguel');
    expect(input.last_name).toBe('Gutierrez');
    expect(input.locale).toBe('en');
    expect(input.picture).toBe('https://example.com/photo.jpg');
    expect(input.phone).toBe('+573001234567');
    expect(input.identities).toContain('Google');
  });

  it('maps only required fields when optionals are missing', () => {
    const input = mapToCreateInput({
      sub: 'b0000000-0000-0000-0000-000000000002',
      email: 'minimal@example.com',
    });
    expect(input.uid).toBe('b0000000-0000-0000-0000-000000000002');
    expect(input.email).toBe('minimal@example.com');
    expect(input.first_name).toBeUndefined();
    expect(input.last_name).toBeUndefined();
    expect(input.locale).toBeUndefined();
    expect(input.picture).toBeUndefined();
    expect(input.phone).toBeUndefined();
    expect(input.identities).toBeUndefined();
  });

  it('does not include email_verified or phone_number_verified', () => {
    const input = mapToCreateInput(fullAttributes);
    expect(input).not.toHaveProperty('email_verified');
    expect(input).not.toHaveProperty('phone_verified');
  });
});

describe('mapToPatchInput', () => {
  it('maps updatable attributes', () => {
    const input = mapToPatchInput(fullAttributes);
    expect(input.first_name).toBe('Miguel');
    expect(input.last_name).toBe('Gutierrez');
    expect(input.locale).toBe('en');
    expect(input.picture).toBe('https://example.com/photo.jpg');
    expect(input.phone).toBe('+573001234567');
  });

  it('returns empty object when no updatable attributes present', () => {
    const input = mapToPatchInput({
      sub: 'c0000000-0000-0000-0000-000000000003',
      email: 'test@example.com',
    });
    expect(Object.keys(input)).toHaveLength(0);
  });

  it('does not include uid, email, or identities', () => {
    const input = mapToPatchInput(fullAttributes);
    expect(input).not.toHaveProperty('uid');
    expect(input).not.toHaveProperty('email');
    expect(input).not.toHaveProperty('identities');
  });
});
