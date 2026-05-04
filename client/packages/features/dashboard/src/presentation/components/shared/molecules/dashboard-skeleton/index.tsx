import React from 'react';
import { ScrollView, View } from 'react-native';
import { Skeleton } from '@features/ui/components';

function CardSkeleton() {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 flex-1">
      <Skeleton width="50%" height={12} borderRadius={4} />
      <View className="mt-2">
        <Skeleton width="70%" height={24} borderRadius={4} />
      </View>
      <View className="mt-1">
        <Skeleton width="30%" height={10} borderRadius={4} />
      </View>
    </View>
  );
}

function ChartSkeleton() {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
      <Skeleton width="40%" height={16} borderRadius={4} />
      <View
        className="flex-row items-end justify-between mt-4 gap-2"
        style={{ height: 120 }}
      >
        {[60, 90, 40, 110, 70, 50, 80].map((h, i) => (
          <View
            key={i}
            className="flex-1 items-center justify-end"
            style={{ height: '100%' }}
          >
            <Skeleton width="80%" height={h} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

function BreakdownSkeleton() {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 flex-1 min-w-[280px]">
      <Skeleton width="50%" height={16} borderRadius={4} />
      {[1, 2, 3].map((i) => (
        <View key={i} className="mt-3">
          <View className="flex-row justify-between mb-1">
            <Skeleton width="30%" height={14} borderRadius={4} />
            <Skeleton width="20%" height={14} borderRadius={4} />
          </View>
          <Skeleton width="100%" height={8} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

function TopExpensesSkeleton() {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
      <Skeleton width="35%" height={16} borderRadius={4} />
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          className="flex-row justify-between items-center mt-3 py-2 border-b border-slate-100 dark:border-slate-700"
        >
          <View className="flex-1">
            <Skeleton width="50%" height={14} borderRadius={4} />
            <View className="mt-1">
              <Skeleton width="30%" height={10} borderRadius={4} />
            </View>
          </View>
          <Skeleton width={80} height={16} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

export function DashboardContentSkeleton() {
  return (
    <>
      <View className="flex-row gap-3 mb-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </View>

      <View className="mt-4">
        <ChartSkeleton />
      </View>

      <View className="flex-row flex-wrap mt-4 gap-4">
        <BreakdownSkeleton />
        <BreakdownSkeleton />
      </View>

      <View className="mt-4 mb-8">
        <TopExpensesSkeleton />
      </View>
    </>
  );
}

export function DashboardSkeleton() {
  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900 px-4 pt-4">
      <Skeleton width="40%" height={28} borderRadius={6} className="mb-4" />

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <Skeleton width="30%" height={12} borderRadius={4} className="mb-1" />
          <Skeleton width="100%" height={40} borderRadius={12} />
        </View>
        <View className="flex-1">
          <Skeleton width="30%" height={12} borderRadius={4} className="mb-1" />
          <Skeleton width="100%" height={40} borderRadius={12} />
        </View>
      </View>

      <DashboardContentSkeleton />
    </ScrollView>
  );
}
