import { SPECIAL_CHARS_REGEX } from '@features/auth/domain/utils/constants';

export interface PasswordRules {
  readonly minLength: boolean;
  readonly hasUppercase: boolean;
  readonly hasLowercase: boolean;
  readonly hasNumber: boolean;
  readonly hasSpecial: boolean;
}

export interface PasswordValidation {
  readonly isValid: boolean;
  readonly rules: PasswordRules;
}

export class Password {
  static validate(value: string): PasswordValidation {
    const rules: PasswordRules = {
      minLength: value.length >= 8,
      hasUppercase: /[A-Z]/.test(value),
      hasLowercase: /[a-z]/.test(value),
      hasNumber: /[0-9]/.test(value),
      hasSpecial: SPECIAL_CHARS_REGEX.test(value),
    };

    return {
      isValid: Object.values(rules).every(Boolean),
      rules,
    };
  }

  static isValid(value: string): boolean {
    return Password.validate(value).isValid;
  }
}
