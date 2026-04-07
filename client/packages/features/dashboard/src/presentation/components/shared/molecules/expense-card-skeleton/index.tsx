import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@features/ui/components';

export function ExpenseCardSkeleton() {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 border border-slate-100 dark:border-slate-700">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Skeleton width="60%" height={18} borderRadius={4} />
          <View className="flex-row items-center gap-2 mt-2">
            <Skeleton width={70} height={22} borderRadius={12} />
            <Skeleton width={80} height={22} borderRadius={12} />
            <Skeleton width={65} height={14} borderRadius={4} />
          </View>
        </View>
        <View className="items-end">
          <Skeleton width={90} height={18} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}
