import React from 'react';
import { Text } from 'react-native';
import type { MetricsByCurrency } from '@packages/models/expenses';
import { useTranslation } from '@packages/i18n';
import { Card } from '@features/ui/components/shared/atoms/card';
import { ProgressBar } from '@features/ui/components/shared/atoms/progress-bar';
import { formatCurrency } from '@features/ui/components/shared/molecules/currency-display';
import { primary, accent, warning, success } from '@features/ui/utils/colors';

export interface CurrencyDistributionProps {
  currencies: MetricsByCurrency[];
}

const CURRENCY_COLORS = [
  primary[600],
  accent[500],
  warning[500],
  success[500],
  primary[400],
  accent[700],
];

export function CurrencyDistribution({
  currencies,
}: CurrencyDistributionProps) {
  const { t } = useTranslation('dashboard');

  const totalUsd = currencies.reduce((sum, c) => sum + c.total_usd, 0);

  return (
    <Card className="p-4 mb-4">
      <Text className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
        {t('metrics.byCurrency')}
      </Text>
      {currencies.length === 0 ? (
        <Text className="text-sm text-neutral-400 dark:text-neutral-500">
          {t('metrics.noData')}
        </Text>
      ) : (
        currencies.map((cur, index) => {
          const percentage =
            totalUsd > 0 ? (cur.total_usd / totalUsd) * 100 : 0;
          const usdEquivalent = t('metrics.equivalent', {
            value: formatCurrency(cur.total_usd),
          });
          return (
            <ProgressBar
              key={cur.currency_id}
              label={cur.currency_code}
              value={formatCurrency(cur.total_original, cur.currency_code)}
              secondaryValue={usdEquivalent}
              percentage={percentage}
              color={
                CURRENCY_COLORS[index % CURRENCY_COLORS.length] ?? primary[600]
              }
            />
          );
        })
      )}
    </Card>
  );
}
