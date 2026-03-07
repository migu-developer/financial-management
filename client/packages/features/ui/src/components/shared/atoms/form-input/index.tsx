import React from 'react';
import { Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';

import { generic, primary } from '@features/ui/utils/colors';

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
  return (
    <View className="mb-4">
      <Text className="text-slate-300 text-sm font-medium mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={!disabled}
        className={`bg-slate-800 text-white rounded-xl px-4 py-3 text-base border ${
          error ? 'border-red-500' : 'border-slate-700'
        } ${disabled ? 'opacity-50' : ''}`}
        style={{ borderColor: error ? generic.error : primary[800] }}
        accessibilityLabel={label}
      />
      {error ? (
        <Text className="text-red-400 text-xs mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
