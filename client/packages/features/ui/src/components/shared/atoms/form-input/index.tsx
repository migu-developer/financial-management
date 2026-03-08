import React from 'react';
import { Text, TextInput, View } from 'react-native';
import type { ColorSchemeName, KeyboardTypeOptions } from 'react-native';

import { generic, surface } from '@features/ui/utils/colors';
import { isWeb } from '@packages/utils';
import { useColorScheme } from '@features/ui/hooks/use-color-scheme';
import { useColorScheme as useWebColorScheme } from '@features/ui/hooks/use-color-scheme.web';
import { ColorScheme } from '@features/ui/utils/constants';

interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  disabled?: boolean;
}

const getColorScheme = (): ColorSchemeName => {
  if (isWeb()) {
    return useWebColorScheme();
  }

  return useColorScheme();
};

export function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  disabled = false,
}: FormInputProps) {
  const colorScheme = getColorScheme();

  const getBorderColor = () => {
    if (colorScheme === ColorScheme.DARK) {
      return surface.dark.border;
    }
    return surface.light.border;
  };

  return (
    <View className="mb-4">
      <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-1">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={!disabled}
        className={`bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-3 text-base border ${
          disabled ? 'opacity-50' : ''
        }`}
        style={{ borderColor: error ? generic.error : getBorderColor() }}
        accessibilityLabel={label}
      />
      {error ? (
        <Text className="text-red-400 text-xs mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
