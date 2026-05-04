import React from 'react';
import { Text } from 'react-native';
import type { MetricsByCategory } from '@packages/models/expenses';
import { useTranslation } from '@packages/i18n';
import { Card } from '@features/ui/components/shared/atoms/card';
import { ProgressBar } from '@features/ui/components/shared/atoms/progress-bar';
import { formatCurrency } from '@features/ui/components/shared/molecules/currency-display';
import { primary, accent, warning, success } from '@features/ui/utils/colors';

export interface CategoryBreakdownProps {
  categories: MetricsByCategory[];
}

const CATEGORY_COLORS = [
  primary[500],
  accent[600],
  warning[500],
  success[500],
  primary[700],
  accent[400],
  primary[300],
  warning[100],
];

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const { t } = useTranslation('dashboard');
  const sorted = [...categories].sort((a, b) => b.total - a.total);

  return (
    <Card className="p-4 mb-4">
      <Text className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
        {t('metrics.byCategoryUsd')}
      </Text>
      {sorted.length === 0 ? (
        <Text className="text-sm text-neutral-400 dark:text-neutral-500">
          {t('metrics.noData')}
        </Text>
      ) : (
        sorted.map((cat, index) => (
          <ProgressBar
            key={cat.category_id}
            label={cat.category_name}
            value={formatCurrency(cat.total)}
            percentage={cat.percentage}
            color={
              CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? primary[500]
            }
          />
        ))
      )}
    </Card>
  );
}
