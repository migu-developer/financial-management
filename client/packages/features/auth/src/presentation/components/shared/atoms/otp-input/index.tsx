import React, { useCallback, useRef } from 'react';
import type {
  TextInput as RNTextInput,
  TextInputKeyPressEvent,
} from 'react-native';
import { View } from 'react-native';
import { useColorScheme } from 'nativewind';

import { generic, surface } from '@features/ui/utils/colors';
import { ColorScheme, TextInputBase } from '@features/ui';
import { KeyEventNames } from '@features/auth/domain/utils/constants';

const OTP_LENGTH = 6;

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function OtpInput({
  value,
  onChange,
  disabled = false,
  error = false,
}: OtpInputProps) {
  const { colorScheme } = useColorScheme();
  const inputRefs = useRef<(RNTextInput | null)[]>(
    Array(OTP_LENGTH).fill(null),
  );

  const chars = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? '');

  const handleChange = useCallback(
    (text: string, index: number) => {
      // Paste: distribute digits across all cells
      if (text.length > 1) {
        const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
        onChange(digits);
        const focusIndex = Math.min(digits.length, OTP_LENGTH - 1);
        inputRefs.current[focusIndex]?.focus();
        return;
      }

      if (!/^\d?$/.test(text)) return;

      const next = [...chars];
      next[index] = text;
      onChange(next.join(''));

      if (text && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [chars, onChange],
  );

  const handleKeyPress = useCallback(
    (e: TextInputKeyPressEvent, index: number) => {
      if (
        e.nativeEvent.key === KeyEventNames.BACKSPACE &&
        !chars[index] &&
        index > 0
      ) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [chars],
  );

  const borderColor = error
    ? generic.error
    : colorScheme === ColorScheme.DARK
      ? surface.dark.border
      : surface.light.border;

  return (
    <View className="flex-row justify-center gap-2">
      {chars.map((char, index) => (
        <TextInputBase
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          value={char}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e as TextInputKeyPressEvent, index)}
          keyboardType="number-pad"
          maxLength={index === 0 ? OTP_LENGTH : 1}
          textAlign="center"
          selectTextOnFocus
          editable={!disabled}
          error={error}
          className="text-xl font-bold text-center"
          style={{ borderColor, width: 48, height: 48 }}
          accessibilityLabel={`Digit ${index + 1} of ${OTP_LENGTH}`}
          accessibilityRole="none"
          testID={`otp-input-${index}`}
        />
      ))}
    </View>
  );
}
