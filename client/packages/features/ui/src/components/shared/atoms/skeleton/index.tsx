import React from 'react';
import type { DimensionValue } from 'react-native';
import { View } from 'react-native';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  circle?: boolean;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 6,
  circle = false,
  className,
}: SkeletonProps) {
  return (
    <View className={className}>
      <View
        style={{
          width: circle ? height : width,
          height,
          borderRadius: circle ? height / 2 : borderRadius,
        }}
        className="animate-pulse bg-slate-200 dark:bg-slate-700"
      />
    </View>
  );
}
