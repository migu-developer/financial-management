import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@features/ui/components';

export function FilterBarSkeleton() {
  return (
    <View className="mb-4 gap-2">
      <Skeleton width="100%" height={48} borderRadius={12} />
      <View className="flex-row gap-2">
        <Skeleton width={80} height={32} borderRadius={16} />
        <Skeleton width={90} height={32} borderRadius={16} />
      </View>
    </View>
  );
}
