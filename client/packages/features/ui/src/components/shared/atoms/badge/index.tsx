import React from 'react';
import { Text, View } from 'react-native';

type BadgeVariant = 'income' | 'outcome' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  income: 'bg-emerald-100 dark:bg-emerald-900',
  outcome: 'bg-red-100 dark:bg-red-900',
  default: 'bg-neutral-100 dark:bg-neutral-700',
};

const textStyles: Record<BadgeVariant, string> = {
  income: 'text-emerald-700 dark:text-emerald-300',
  outcome: 'text-red-700 dark:text-red-300',
  default: 'text-neutral-600 dark:text-neutral-300',
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <View className={`px-2 py-0.5 rounded-full ${variantStyles[variant]}`}>
      <Text className={`text-xs font-medium ${textStyles[variant]}`}>
        {label}
      </Text>
    </View>
  );
}
