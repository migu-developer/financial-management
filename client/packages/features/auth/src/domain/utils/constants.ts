/**
 * Regular expression for email.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Regular expression for phone number starting with + or 0.
 */
export const PHONE_START_REGEX = /^[+\d]/;

/**
 * Regular expression for special characters.
 */
export const SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

/**
 * Regular expression for phone number format.
 */
export const PHONE_FORMAT_REGEX = /^\+?[\d\s\-().]{7,20}$/;

/**
 * Default country code for phone number.
 */
export const DEFAULT_COUNTRY = 'US';

/**
 * Key event names.
 */
export enum KeyEventNames {
  BACKSPACE = 'Backspace',
}

/**
 * Identifier type.
 */
export enum IdentifierType {
  EMAIL = 'email',
  PHONE = 'phone',
}
