import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

import {
  generic,
  surface,
  textTokens,
  uiTokens,
} from '@features/ui/utils/colors';
import { ColorScheme } from '@features/ui/utils/constants';
import { useTranslation } from '@packages/i18n';

interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  keyboardType?: KeyboardTypeOptions;
  className?: string;
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
  showPasswordToggle = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  placeholderTextColor,
  className,
  error,
  disabled = false,
}: FormInputProps) {
  const { t } = useTranslation('ui');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === ColorScheme.DARK;

  const borderColor = error
    ? generic.error
    : isDark
      ? surface.dark.border
      : surface.light.border;

  const iconColor = isDark ? uiTokens.moonColor : textTokens.light.muted;
  const isSecure = secureTextEntry && !isPasswordVisible;

  return (
    <View className={className ?? 'mb-4'}>
      <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-1">
        {label}
      </Text>
      <View
        className={`bg-slate-100 dark:bg-slate-800 rounded-xl flex-row items-center border overflow-hidden ${
          disabled ? 'opacity-50' : ''
        }`}
        style={{ borderColor }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor ?? textTokens.dark.muted}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={!disabled}
          className="flex-1 px-4 py-3 text-base text-slate-900 dark:text-white"
          style={{ borderWidth: 0 }}
          accessibilityLabel={label}
        />
        {secureTextEntry && showPasswordToggle ? (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible((v) => !v)}
            className="px-3 py-3"
            accessibilityRole="button"
            accessibilityLabel={
              isPasswordVisible ? t('hidePassword') : t('showPassword')
            }
          >
            <MaterialCommunityIcons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={20}
              color={iconColor}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <Text className="text-red-400 text-xs mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
