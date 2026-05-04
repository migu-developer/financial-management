import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { isWeb } from '@packages/utils';

import { generic, neutral, primary, surface } from '@features/ui/utils/colors';
import { fontSizeScale, space, radius } from '@features/ui/utils/spacing';
import { ColorScheme } from '@features/ui/utils/constants';
import { useThemeActions } from '@features/ui/contexts/theme-context';
import { TextInputBase } from '@features/ui/components/shared/atoms/text-input-base';

export interface DateInputProps {
  label: string;
  value: string;
  onChangeText: (date: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function isValidDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function WebDateInput({
  label,
  value,
  onChangeText,
  error,
  disabled = false,
  className,
}: DateInputProps) {
  const { colorScheme } = useThemeActions();
  const isDark = colorScheme === ColorScheme.DARK;
  const [isFocused, setIsFocused] = useState(false);

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
      <input
        type="date"
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        disabled={disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-label={label}
        style={{
          backgroundColor: isDark ? surface.dark.card : neutral[100],
          color: isDark ? generic.white : neutral[900],
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor,
          borderRadius: radius.lg,
          paddingTop: space.sm,
          paddingBottom: space.sm,
          paddingLeft: space.s14,
          paddingRight: space.s14,
          fontSize: fontSizeScale.base,
          fontFamily: 'inherit',
          outlineStyle: 'none' as never,
          width: '100%',
          boxSizing: 'border-box' as never,
          colorScheme: isDark ? ('dark' as never) : ('light' as never),
        }}
      />
      {error ? (
        <Text className="text-red-400 text-xs mt-1">{error}</Text>
      ) : null}
    </View>
  );
}

function MobileDateInput({
  label,
  value,
  onChangeText,
  placeholder = 'YYYY-MM-DD',
  error,
  disabled = false,
  className,
}: DateInputProps) {
  const { colorScheme } = useThemeActions();
  const isDark = colorScheme === ColorScheme.DARK;
  const [isFocused, setIsFocused] = useState(false);

  const isInvalid =
    value.length > 0 && value.length === 10 && !isValidDate(value);
  const displayError = error ?? (isInvalid ? 'Invalid date' : undefined);

  const borderColor = displayError
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
      <TextInputBase
        value={value}
        onChangeText={(text) => onChangeText(applyDateMask(text))}
        placeholder={placeholder}
        keyboardType="number-pad"
        maxLength={10}
        editable={!disabled}
        error={!!displayError}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        accessibilityLabel={label}
        style={[{ borderColor }]}
      />
      {displayError ? (
        <Text className="text-red-400 text-xs mt-1">{displayError}</Text>
      ) : null}
    </View>
  );
}

export function DateInput(props: DateInputProps) {
  const isPlatformWeb = useMemo(() => isWeb(), []);

  if (isPlatformWeb) {
    return <WebDateInput {...props} />;
  }
  return <MobileDateInput {...props} />;
}
