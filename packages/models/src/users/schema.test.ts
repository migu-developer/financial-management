import { createUserSchema, patchUserSchema } from './schema';

describe('createUserSchema', () => {
  it('uses JSON Schema Draft 4', () => {
    expect(createUserSchema.schema).toBe(
      'http://json-schema.org/draft-04/schema#',
    );
  });

  it('is an object type', () => {
    expect(createUserSchema.type).toBe('object');
  });

  it('requires uid and email', () => {
    expect(createUserSchema.required).toEqual(['uid', 'email']);
  });

  it('does not allow additional properties', () => {
    expect(createUserSchema.additionalProperties).toBe(false);
  });

  it('defines first_name as optional', () => {
    expect(createUserSchema.properties.first_name).toBeDefined();
    expect(createUserSchema.required.includes('first_name')).toBe(false);
  });

  it('defines last_name as optional', () => {
    expect(createUserSchema.properties.last_name).toBeDefined();
    expect(createUserSchema.required.includes('last_name')).toBe(false);
  });

  it('defines provider_id as optional UUID', () => {
    expect(createUserSchema.properties.provider_id).toBeDefined();
    expect(createUserSchema.required.includes('provider_id')).toBe(false);
  });

  it('validates UUID pattern on uid and provider_id', () => {
    const uuidFields = ['uid', 'provider_id'] as const;

    for (const field of uuidFields) {
      expect(createUserSchema.properties[field].pattern).toMatch(
        /\^\[0-9a-f\]/,
      );
    }
  });

  it('validates email has format and maxLength', () => {
    expect(createUserSchema.properties.email.format).toBe('email');
    expect(createUserSchema.properties.email.maxLength).toBe(255);
  });

  it('validates first_name between 1 and 100 characters', () => {
    expect(createUserSchema.properties.first_name.minLength).toBe(1);
    expect(createUserSchema.properties.first_name.maxLength).toBe(100);
  });
});

describe('patchUserSchema', () => {
  it('uses JSON Schema Draft 4', () => {
    expect(patchUserSchema.schema).toBe(
      'http://json-schema.org/draft-04/schema#',
    );
  });

  it('has no required fields', () => {
    expect(
      (patchUserSchema as Record<string, unknown>).required,
    ).toBeUndefined();
  });

  it('requires at least one property', () => {
    expect(patchUserSchema.minProperties).toBe(1);
  });

  it('does not allow additional properties', () => {
    expect(patchUserSchema.additionalProperties).toBe(false);
  });

  it('does not include uid (cannot change user uid)', () => {
    expect(
      (patchUserSchema.properties as Record<string, unknown>).uid,
    ).toBeUndefined();
  });

  it('does not include email (cannot change user email)', () => {
    expect(
      (patchUserSchema.properties as Record<string, unknown>).email,
    ).toBeUndefined();
  });

  it('validates UUID pattern on document_id', () => {
    expect(patchUserSchema.properties.document_id.pattern).toMatch(
      /\^\[0-9a-f\]/,
    );
  });

  it('has same field definitions as create for shared fields', () => {
    expect(patchUserSchema.properties.first_name).toEqual(
      createUserSchema.properties.first_name,
    );
    expect(patchUserSchema.properties.last_name).toEqual(
      createUserSchema.properties.last_name,
    );
    expect(patchUserSchema.properties.locale).toEqual(
      createUserSchema.properties.locale,
    );
  });
});
