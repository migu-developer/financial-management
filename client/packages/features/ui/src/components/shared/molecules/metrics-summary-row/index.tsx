import React from 'react';
import { View } from 'react-native';
import type { MetricsSummary } from '@packages/models/expenses';
import { useTranslation } from '@packages/i18n';
import { StatCard } from '@features/ui/components/shared/atoms/stat-card';
import { formatCurrency } from '@features/ui/components/shared/molecules/currency-display';

export interface MetricsSummaryRowProps {
  summary: MetricsSummary;
}

export function MetricsSummaryRow({ summary }: MetricsSummaryRowProps) {
  const { t } = useTranslation('dashboard');
  const globalCurrency = t('metrics.globalCurrency');

  return (
    <View className="flex-row flex-wrap gap-3 mb-4">
      <StatCard
        label={t('metrics.income')}
        value={formatCurrency(summary.total_income)}
        subtitle={globalCurrency}
      />
      <StatCard
        label={t('metrics.outcome')}
        value={formatCurrency(summary.total_outcome)}
        subtitle={globalCurrency}
      />
      <StatCard
        label={t('metrics.balance')}
        value={formatCurrency(summary.net_balance)}
        subtitle={globalCurrency}
      />
      <StatCard
        label={t('metrics.transactions')}
        value={String(summary.total_transactions)}
      />
    </View>
  );
}
