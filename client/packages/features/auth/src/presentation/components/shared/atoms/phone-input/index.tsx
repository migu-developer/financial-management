import React from 'react';
import { PhoneInput as PhoneInputBase } from '@features/ui';
import type { PhoneInputProps } from '@features/ui';

export type { PhoneInputProps };

export function PhoneInput(props: PhoneInputProps) {
  return <PhoneInputBase {...props} />;
}
