import React, { useCallback } from 'react';

import { useTranslation } from '@packages/i18n';
import { FormInput } from '@features/ui';

import { IdentifierType as IdentifierTypeEnum } from '@features/auth/domain/utils/constants';

import { PhoneInput } from '@features/auth/presentation/components/shared/atoms/phone-input';

export type IdentifierType =
  (typeof IdentifierTypeEnum)[keyof typeof IdentifierTypeEnum];

export interface IdentifierInputProps {
  value: string;
  onChangeIdentifier: (value: string, type: IdentifierType) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Pure function — exported for unit testing.
 * Detects identifier type from the current raw value.
 */
export function detectIdentifierType(raw: string): IdentifierType {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+') || /^\d{3,}$/.test(trimmed))
    return IdentifierTypeEnum.PHONE;
  return IdentifierTypeEnum.EMAIL;
}

export function IdentifierInput({
  value,
  onChangeIdentifier,
  error,
  disabled = false,
}: IdentifierInputProps) {
  const { t } = useTranslation('login');

  const identifierType = detectIdentifierType(value);

  const handleEmailChange = useCallback(
    (text: string) => {
      onChangeIdentifier(text, IdentifierTypeEnum.EMAIL);
    },
    [onChangeIdentifier],
  );

  const handlePhoneChange = useCallback(
    (e164: string) => {
      onChangeIdentifier(e164, IdentifierTypeEnum.PHONE);
    },
    [onChangeIdentifier],
  );

  if (identifierType === IdentifierTypeEnum.PHONE) {
    return (
      <PhoneInput
        value={value}
        onChange={handlePhoneChange}
        label={t('identifierInput.label')}
        placeholder={t('identifierInput.placeholder')}
        error={error}
        disabled={disabled}
      />
    );
  }

  return (
    <FormInput
      label={t('identifierInput.label')}
      value={value}
      onChangeText={handleEmailChange}
      placeholder={t('identifierInput.placeholder')}
      keyboardType="email-address"
      autoCapitalize="none"
      error={error}
      disabled={disabled}
    />
  );
}
