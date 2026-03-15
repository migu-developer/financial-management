import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import type { KeyboardTypeOptions, TextInputProps } from 'react-native';

import { generic, primary, surface } from '@features/ui/utils/colors';
import { ColorScheme } from '@features/ui/utils/constants';
import { useThemeActions } from '@features/ui/contexts/theme-context';
import { TextInputBase } from '@features/ui/components/shared/atoms/text-input-base';
import { isWeb } from '@packages/utils';
import { space } from '@features/ui/utils/spacing';

export interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  className?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: TextInputProps['autoComplete'];
  autoFocus?: boolean;
  error?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete = 'off',
  autoFocus,
  className,
  error,
  disabled = false,
  icon,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
}: FormInputProps) {
  const { colorScheme } = useThemeActions();
  const isDark = colorScheme === ColorScheme.DARK;
  const [isFocused, setIsFocused] = useState(false);

  const isPlatformWeb = useMemo(() => isWeb(), []);

  const borderColor = error
    ? generic.error
    : isFocused
      ? primary[400]
      : isDark
        ? surface.dark.border
        : surface.light.border;

  return (
    <View className={className ?? 'mb-4'}>
      <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-1">
        {label}
      </Text>
      <View
        style={{ position: 'relative' }}
        className={disabled ? 'opacity-50' : ''}
      >
        <TextInputBase
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          editable={!disabled}
          error={!!error}
          onFocus={() => {
            setIsFocused(true);
            onFocusProp?.();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlurProp?.();
          }}
          accessibilityLabel={label}
          style={[
            { borderColor },
            icon ? { paddingRight: space['2xl'] } : undefined,
            isPlatformWeb ? { outlineStyle: 'none' as never } : undefined,
          ]}
        />
        {icon ? (
          <View
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
              paddingHorizontal: space.sm,
            }}
            pointerEvents="box-none"
          >
            {icon}
          </View>
        ) : null}
      </View>
      {error ? (
        <Text className="text-red-400 text-xs mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
