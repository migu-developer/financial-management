import {
  parsePhoneNumber,
  isValidPhoneNumber,
  AsYouType,
  type CountryCode,
} from 'libphonenumber-js/min';

import { DEFAULT_COUNTRY } from '@features/auth/domain/utils/constants';

import type {
  IPhoneNumberParser,
  ParsedPhoneNumber,
} from '@features/auth/domain/value-objects/phone-number';

export class LibPhoneNumberParser implements IPhoneNumberParser {
  parse(input: string): ParsedPhoneNumber | null {
    try {
      const parsed = parsePhoneNumber(input);
      if (!parsed?.isValid() || !parsed.country) return null;
      return {
        countryCode: parsed.country,
        dialCode: `+${parsed.countryCallingCode}`,
        number: parsed.nationalNumber,
        e164: parsed.number,
      };
    } catch {
      return null;
    }
  }

  isValid(input: string): boolean {
    try {
      return isValidPhoneNumber(input);
    } catch {
      return false;
    }
  }

  format(input: string, defaultCountry = DEFAULT_COUNTRY): string {
    try {
      const formatted = new AsYouType(defaultCountry as CountryCode).input(
        input,
      );
      return formatted.length > 0 ? formatted : input;
    } catch {
      return input;
    }
  }

  toE164(input: string, defaultCountry = DEFAULT_COUNTRY): string | null {
    try {
      const parsed = parsePhoneNumber(input, defaultCountry as CountryCode);
      if (!parsed?.isValid()) return null;
      return parsed.number;
    } catch {
      return null;
    }
  }
}

export const phoneNumberParser = new LibPhoneNumberParser();
