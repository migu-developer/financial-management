import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { FormInput } from '@features/ui/components/shared/atoms/form-input';
import { Icon } from '@features/ui/components/shared/atoms/icon';
import { textTokens } from '@features/ui/utils/colors';
import { useThemeActions } from '@features/ui/contexts/theme-context';
import { ColorScheme } from '@features/ui/utils/constants';

export interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChangeText: (text: string) => void;
  debounceMs?: number;
  label?: string;
  disabled?: boolean;
}

export function SearchInput({
  placeholder,
  value: controlledValue,
  onChangeText,
  debounceMs = 300,
  disabled = false,
  label,
}: SearchInputProps) {
  const { colorScheme } = useThemeActions();
  const isDark = colorScheme === ColorScheme.DARK;
  const [localValue, setLocalValue] = useState(controlledValue ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (controlledValue !== undefined) setLocalValue(controlledValue);
  }, [controlledValue]);

  const handleChange = useCallback(
    (text: string) => {
      setLocalValue(text);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChangeText(text), debounceMs);
    },
    [onChangeText, debounceMs],
  );

  const handleClear = useCallback(() => {
    setLocalValue('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onChangeText('');
  }, [onChangeText]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const iconColor = isDark ? textTokens.dark.muted : textTokens.light.muted;

  return (
    <FormInput
      label={label ?? ''}
      value={localValue}
      onChangeText={handleChange}
      placeholder={placeholder}
      autoCapitalize="none"
      disabled={disabled}
      className={label ? 'mb-0' : 'mb-0'}
      icon={
        localValue.length > 0 ? (
          <Pressable
            onPress={handleClear}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Icon name="close" size={18} color={iconColor} />
          </Pressable>
        ) : (
          <Icon name="search" size={18} color={iconColor} />
        )
      }
    />
  );
}
