import { UUID_PATTERN, uuidField, UUID_REGEX } from './uuid';

describe('UUID_PATTERN', () => {
  it('is a valid regex string', () => {
    expect(() => new RegExp(UUID_PATTERN)).not.toThrow();
  });
});

describe('uuidField', () => {
  it('has type string', () => {
    expect(uuidField.type).toBe('string');
  });

  it('has UUID pattern', () => {
    expect(uuidField.pattern).toBe(UUID_PATTERN);
  });
});

describe('UUID_REGEX', () => {
  it('matches valid UUIDs', () => {
    expect(UUID_REGEX.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(UUID_REGEX.test('00000000-0000-0000-0000-000000000000')).toBe(true);
  });

  it('rejects invalid UUIDs', () => {
    expect(UUID_REGEX.test('not-a-uuid')).toBe(false);
    expect(UUID_REGEX.test('550e8400-e29b-41d4-a716')).toBe(false);
    expect(UUID_REGEX.test('')).toBe(false);
  });
});
