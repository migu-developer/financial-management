import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import type { TouchableOpacityProps } from 'react-native';

import { generic, primary } from '@features/ui/utils/colors';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const containerVariants: Record<Variant, string> = {
  primary: 'bg-primary-600',
  secondary: 'bg-accent-500',
  ghost: 'bg-transparent',
  outline: 'border-2 border-primary-600 bg-transparent',
};

const containerSizes: Record<Size, string> = {
  sm: 'px-4 py-2 rounded-lg',
  md: 'px-6 py-3 rounded-xl',
  lg: 'px-8 py-4 rounded-2xl',
};

const labelVariants: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  ghost: 'text-primary-600',
  outline: 'text-primary-600',
};

const labelSizes: Record<Size, string> = {
  sm: 'text-sm font-semibold',
  md: 'text-base font-semibold',
  lg: 'text-lg font-bold',
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const spinnerColor =
    variant === 'primary' || variant === 'secondary'
      ? generic.white
      : primary[600];

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center ${containerVariants[variant]} ${containerSizes[size]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={spinnerColor}
          style={{ marginRight: 8 }}
        />
      )}
      <Text className={`${labelVariants[variant]} ${labelSizes[size]}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
