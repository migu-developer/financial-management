import {
  EMAIL_REGEX,
  PHONE_START_REGEX,
} from '@features/auth/domain/utils/constants';
import { PhoneNumber } from './phone-number';

export type IdentifierType = 'email' | 'phone' | 'unknown';

export interface ParsedIdentifier {
  readonly type: IdentifierType;
  readonly value: string;
  readonly normalizedValue: string;
}

export class Identifier {
  static detect(input: string): IdentifierType {
    const trimmed = input.trim();
    if (!trimmed) return 'unknown';
    if (trimmed.includes('@')) return 'email';
    if (PHONE_START_REGEX.test(trimmed)) return 'phone';
    return 'unknown';
  }

  static isEmail(input: string): boolean {
    return EMAIL_REGEX.test(input.trim());
  }

  static isPhone(input: string): boolean {
    return PhoneNumber.looksLikePhone(input.trim());
  }

  static parse(input: string): ParsedIdentifier {
    const trimmed = input.trim();
    const type = Identifier.detect(trimmed);

    const normalizedValue = type === 'email' ? trimmed.toLowerCase() : trimmed;

    return { type, value: trimmed, normalizedValue };
  }
}
