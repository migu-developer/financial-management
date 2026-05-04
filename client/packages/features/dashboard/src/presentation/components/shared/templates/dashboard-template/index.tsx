import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useTranslation } from '@packages/i18n';
import {
  DateInput,
  MetricsSummaryRow,
  CategoryBreakdown,
  DailyTrendChart,
  TopExpensesList,
  CurrencyDistribution,
} from '@features/ui';
import { useMetrics } from '@features/dashboard/presentation/providers/metrics-provider';
import {
  DashboardSkeleton,
  DashboardContentSkeleton,
} from '@features/dashboard/presentation/components/shared/molecules/dashboard-skeleton';

export function DashboardTemplate() {
  const { t } = useTranslation('dashboard');
  const { metrics, loading, error, filters, setFilters, refresh } =
    useMetrics();

  if (loading && !metrics) {
    return <DashboardSkeleton />;
  }

  if (error && !metrics) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900 px-8">
        <Text className="text-red-500 text-center text-base">{error}</Text>
        <Text
          className="text-primary-400 font-semibold text-base mt-4"
          onPress={refresh}
        >
          {t('metrics.retry', { defaultValue: 'Retry' })}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900 px-4 pt-4">
      <Text className="text-slate-900 dark:text-white font-bold text-2xl mb-4">
        {t('metrics.title')}
      </Text>

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <DateInput
            label={t('metrics.filterFrom')}
            value={filters.from}
            onChangeText={(from) => setFilters({ ...filters, from })}
            className=""
          />
        </View>
        <View className="flex-1">
          <DateInput
            label={t('metrics.filterTo')}
            value={filters.to}
            onChangeText={(to) => setFilters({ ...filters, to })}
            className=""
          />
        </View>
      </View>

      {loading && <DashboardContentSkeleton />}

      {!loading && metrics && (
        <>
          <MetricsSummaryRow summary={metrics.summary} />

          {metrics.daily_trend.length > 0 && (
            <View className="mt-4">
              <DailyTrendChart trends={metrics.daily_trend} />
            </View>
          )}

          <View className="flex-row flex-wrap mt-4 gap-4">
            {metrics.by_category.length > 0 && (
              <View className="flex-1 min-w-[280px]">
                <CategoryBreakdown categories={metrics.by_category} />
              </View>
            )}
            {metrics.by_currency.length > 0 && (
              <View className="flex-1 min-w-[280px]">
                <CurrencyDistribution currencies={metrics.by_currency} />
              </View>
            )}
          </View>

          {metrics.top_expenses.length > 0 && (
            <View className="mt-4 mb-8">
              <TopExpensesList expenses={metrics.top_expenses} />
            </View>
          )}

          {metrics.summary.total_transactions === 0 && (
            <View className="items-center py-8">
              <Text className="text-slate-500 dark:text-slate-400 text-base">
                {t('metrics.noData')}
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
