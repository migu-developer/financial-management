import React from 'react';
import { Pressable, Text } from 'react-native';

export interface FilterChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function FilterChip({
  label,
  selected = false,
  disabled = false,
  onPress,
}: FilterChipProps) {
  const bgClass = selected
    ? 'bg-primary-100 dark:bg-primary-900 border-primary-400 dark:border-primary-600'
    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';

  const textClass = selected
    ? 'text-primary-700 dark:text-primary-300'
    : 'text-slate-600 dark:text-slate-400';

  return (
    <Pressable
      className={`px-3 py-1.5 rounded-full border ${bgClass} ${disabled ? 'opacity-50' : ''}`}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
    >
      <Text className={`text-xs font-medium ${textClass}`}>{label}</Text>
    </Pressable>
  );
}
