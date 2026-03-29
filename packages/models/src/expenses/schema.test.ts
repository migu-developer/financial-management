import { createExpenseSchema, patchExpenseSchema } from './schema';

describe('createExpenseSchema', () => {
  it('uses JSON Schema Draft 4', () => {
    expect(createExpenseSchema.schema).toBe(
      'http://json-schema.org/draft-04/schema#',
    );
  });

  it('is an object type', () => {
    expect(createExpenseSchema.type).toBe('object');
  });

  it('requires name, value, currency_id, expense_type_id (user_id comes from JWT)', () => {
    expect(createExpenseSchema.required).toEqual([
      'name',
      'value',
      'currency_id',
      'expense_type_id',
    ]);
  });

  it('does not allow additional properties', () => {
    expect(createExpenseSchema.additionalProperties).toBe(false);
  });

  it('defines expense_category_id as optional UUID', () => {
    expect(createExpenseSchema.properties.expense_category_id).toBeDefined();
    expect(createExpenseSchema.required.includes('expense_category_id')).toBe(
      false,
    );
  });

  it('validates UUID pattern on all ID fields', () => {
    const idFields = [
      'currency_id',
      'expense_type_id',
      'expense_category_id',
    ] as const;

    for (const field of idFields) {
      expect(createExpenseSchema.properties[field].pattern).toMatch(
        /\^\[0-9a-f\]/,
      );
    }
  });

  it('validates name between 1 and 500 characters', () => {
    expect(createExpenseSchema.properties.name.minLength).toBe(1);
    expect(createExpenseSchema.properties.name.maxLength).toBe(500);
  });

  it('validates value > 0', () => {
    expect(createExpenseSchema.properties.value.minimum).toBe(0);
    expect(createExpenseSchema.properties.value.exclusiveMinimum).toBe(true);
  });
});

describe('patchExpenseSchema', () => {
  it('uses JSON Schema Draft 4', () => {
    expect(patchExpenseSchema.schema).toBe(
      'http://json-schema.org/draft-04/schema#',
    );
  });

  it('has no required fields', () => {
    expect(
      (patchExpenseSchema as Record<string, unknown>).required,
    ).toBeUndefined();
  });

  it('requires at least one property', () => {
    expect(patchExpenseSchema.minProperties).toBe(1);
  });

  it('does not allow additional properties', () => {
    expect(patchExpenseSchema.additionalProperties).toBe(false);
  });

  it('does not include user_id (cannot change expense owner)', () => {
    expect(
      (patchExpenseSchema.properties as Record<string, unknown>).user_id,
    ).toBeUndefined();
  });

  it('has same field definitions as create for shared fields', () => {
    expect(patchExpenseSchema.properties.name).toEqual(
      createExpenseSchema.properties.name,
    );
    expect(patchExpenseSchema.properties.value).toEqual(
      createExpenseSchema.properties.value,
    );
    expect(patchExpenseSchema.properties.currency_id).toEqual(
      createExpenseSchema.properties.currency_id,
    );
  });
});
