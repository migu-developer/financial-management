import React from 'react';
import { Text, View } from 'react-native';

export interface ProgressBarProps {
  percentage: number;
  color: string;
  label: string;
  value: string;
  secondaryValue?: string;
}

export function ProgressBar({
  percentage,
  color,
  label,
  value,
  secondaryValue,
}: ProgressBarProps) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text
          className="text-sm text-neutral-700 dark:text-neutral-300 flex-1"
          numberOfLines={1}
        >
          {label}
        </Text>
        <View className="flex-row items-baseline ml-2">
          <Text className="text-sm font-medium text-neutral-900 dark:text-white">
            {value}
          </Text>
          {secondaryValue && (
            <Text className="text-xs text-neutral-400 dark:text-neutral-500 ml-1.5">
              {secondaryValue}
            </Text>
          )}
        </View>
      </View>
      <View className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${clampedPercentage}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}
