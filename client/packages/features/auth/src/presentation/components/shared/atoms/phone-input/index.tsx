import React from 'react';
import { PhoneInput as PhoneInputBase } from '@features/ui';
import type { PhoneInputProps } from '@features/ui';

import { DEFAULT_COUNTRY } from '@features/auth/domain/utils/constants';

export type { PhoneInputProps };

export function PhoneInput(props: PhoneInputProps) {
  return <PhoneInputBase defaultCountry={DEFAULT_COUNTRY} {...props} />;
}
