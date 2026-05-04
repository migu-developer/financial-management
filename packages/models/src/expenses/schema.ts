import { uuidField } from '@packages/models/shared/fields';

const nameField = {
  type: 'string' as const,
  minLength: 1,
  maxLength: 500,
};

const valueField = {
  type: 'number' as const,
  minimum: 0,
  exclusiveMinimum: true,
};

const dateField = {
  type: 'string' as const,
  pattern: '^\\d{4}-\\d{2}-\\d{2}$',
};

export const createExpenseSchema = {
  schema: 'http://json-schema.org/draft-04/schema#',
  title: 'CreateExpense',
  type: 'object' as const,
  required: ['name', 'value', 'currency_id', 'expense_type_id'],
  properties: {
    name: nameField,
    value: valueField,
    currency_id: uuidField,
    expense_type_id: uuidField,
    expense_category_id: uuidField,
    date: dateField,
  },
  additionalProperties: false,
};

export const updateExpenseSchema = {
  ...createExpenseSchema,
  title: 'UpdateExpense',
};

export const patchExpenseSchema = {
  schema: 'http://json-schema.org/draft-04/schema#',
  title: 'PatchExpense',
  type: 'object' as const,
  minProperties: 1,
  properties: {
    name: nameField,
    value: valueField,
    currency_id: uuidField,
    expense_type_id: uuidField,
    expense_category_id: uuidField,
    date: dateField,
  },
  additionalProperties: false,
};
