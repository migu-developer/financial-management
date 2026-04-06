import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeActions } from '@features/ui/contexts/theme-context';
import { ColorScheme } from '@features/ui/utils/constants';
import { generic, surface, textTokens } from '@features/ui/utils/colors';
import { fontSizeScale, space } from '@features/ui/utils/spacing';

export interface SelectorFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
  error?: string;
}

export function SelectorField({
  label,
  value,
  placeholder,
  onPress,
  disabled = false,
  error,
}: SelectorFieldProps) {
  const { colorScheme } = useThemeActions();
  const isDark = colorScheme === ColorScheme.DARK;
  const borderColor = error
    ? generic.error
    : isDark
      ? surface.dark.border
      : surface.light.border;

  return (
    <View>
      <Text className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-1">
        {label}
      </Text>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        className="flex-row items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-xl px-4 border"
        style={{ borderColor, paddingVertical: space.sm }}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text
          className={
            value
              ? 'text-base text-slate-900 dark:text-white'
              : 'text-base text-slate-400 dark:text-slate-500'
          }
        >
          {value || placeholder}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={fontSizeScale.lg}
          color={isDark ? textTokens.dark.muted : textTokens.light.muted}
        />
      </TouchableOpacity>
      {error && <Text className="text-red-400 text-xs mt-1">{error}</Text>}
    </View>
  );
}
