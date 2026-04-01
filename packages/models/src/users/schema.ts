import { uuidField } from '@packages/models/shared/fields';

const emailField = {
  type: 'string' as const,
  format: 'email',
  maxLength: 255,
};

const nameField = {
  type: 'string' as const,
  minLength: 1,
  maxLength: 100,
};

const localeField = {
  type: 'string' as const,
  minLength: 1,
  maxLength: 10,
};

const textField = {
  type: 'string' as const,
  maxLength: 2000,
};

const phoneField = {
  type: 'string' as const,
  pattern: '^\\+[0-9]+$',
  minLength: 2,
  maxLength: 30,
};

export const createUserSchema = {
  schema: 'http://json-schema.org/draft-04/schema#',
  title: 'CreateUser',
  type: 'object' as const,
  required: ['uid', 'email'],
  properties: {
    uid: uuidField,
    email: emailField,
    first_name: nameField,
    last_name: nameField,
    locale: localeField,
    picture: textField,
    phone: phoneField,
    identities: textField,
    provider_id: uuidField,
  },
  additionalProperties: false,
};

export const patchUserSchema = {
  schema: 'http://json-schema.org/draft-04/schema#',
  title: 'PatchUser',
  type: 'object' as const,
  minProperties: 1,
  properties: {
    first_name: nameField,
    last_name: nameField,
    locale: localeField,
    picture: textField,
    phone: phoneField,
    document_id: uuidField,
  },
  additionalProperties: false,
};
