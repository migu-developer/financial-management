import { PHONE_FORMAT_REGEX } from '@features/auth/domain/utils/constants';

export interface ParsedPhoneNumber {
  readonly countryCode: string;
  readonly dialCode: string;
  readonly number: string;
  readonly e164: string;
}

export interface IPhoneNumberParser {
  parse(input: string): ParsedPhoneNumber | null;
  isValid(input: string): boolean;
  format(input: string, defaultCountry?: string): string;
  toE164(input: string, defaultCountry?: string): string | null;
}

export class PhoneNumber {
  static looksLikePhone(input: string): boolean {
    return PHONE_FORMAT_REGEX.test(input.trim());
  }
}
