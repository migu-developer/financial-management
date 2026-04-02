import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from '@packages/i18n';

interface ExpenseSummaryProps {
  totalCount: number | null;
  loading: boolean;
}

export function ExpenseSummary({ totalCount, loading }: ExpenseSummaryProps) {
  const { t } = useTranslation('dashboard');

  if (loading && totalCount === null) return null;

  return (
    <View className="flex-row items-center gap-2 mb-4">
      <Text className="text-sm text-slate-500 dark:text-slate-400">
        {totalCount !== null
          ? t('expenses.totalExpenses', { count: totalCount })
          : ''}
      </Text>
    </View>
  );
}
