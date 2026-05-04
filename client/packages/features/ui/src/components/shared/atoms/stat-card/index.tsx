import React from 'react';
import { Text, View } from 'react-native';
import { Card } from '@features/ui/components/shared/atoms/card';

export interface StatCardTrend {
  value: number;
  isPositive: boolean;
}

export interface StatCardProps {
  label: string;
  value: string;
  icon?: string;
  trend?: StatCardTrend;
  subtitle?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  trend,
  subtitle,
  className = '',
}: StatCardProps) {
  return (
    <Card className={`p-4 flex-1 min-w-[140px] ${className}`}>
      <Text className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">
        {label}
      </Text>
      <Text className="text-lg font-bold text-neutral-900 dark:text-white">
        {value}
      </Text>
      {subtitle && (
        <Text className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
          {subtitle}
        </Text>
      )}
      {trend && (
        <View className="flex-row items-center mt-1">
          <Text
            className={`text-xs font-medium ${
              trend.isPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {trend.isPositive ? '+' : '-'}
            {Math.abs(trend.value).toFixed(1)}%
          </Text>
        </View>
      )}
    </Card>
  );
}
