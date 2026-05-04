import React from 'react';
import { Text, View } from 'react-native';
import type { MetricsTopExpense } from '@packages/models/expenses';
import { useTranslation } from '@packages/i18n';
import { Card } from '@features/ui/components/shared/atoms/card';
import { formatCurrency } from '@features/ui/components/shared/molecules/currency-display';

export interface TopExpensesListProps {
  expenses: MetricsTopExpense[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

export function TopExpensesList({ expenses }: TopExpensesListProps) {
  const { t } = useTranslation('dashboard');
  const top5 = expenses.slice(0, 5);

  return (
    <Card className="p-4 mb-4">
      <Text className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
        {t('metrics.topExpenses')}
      </Text>
      {top5.length === 0 ? (
        <Text className="text-sm text-neutral-400 dark:text-neutral-500">
          {t('metrics.noData')}
        </Text>
      ) : (
        top5.map((expense, index) => {
          const usdEquivalent = t('metrics.equivalent', {
            value: formatCurrency(expense.global_value),
          });

          return (
            <View
              key={expense.id}
              className={`flex-row items-center justify-between py-2 ${
                index < top5.length - 1
                  ? 'border-b border-neutral-100 dark:border-neutral-700'
                  : ''
              }`}
            >
              <View className="flex-1 mr-2">
                <Text
                  className="text-sm font-medium text-neutral-900 dark:text-white"
                  numberOfLines={1}
                >
                  {expense.name}
                </Text>
                <View className="flex-row gap-2 mt-0.5">
                  {expense.category_name && (
                    <Text className="text-xs text-neutral-400 dark:text-neutral-500">
                      {expense.category_name}
                    </Text>
                  )}
                  <Text className="text-xs text-neutral-400 dark:text-neutral-500">
                    {formatDate(expense.date)}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(
                    expense.original_value,
                    expense.currency_code,
                  )}
                </Text>
                <Text className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                  ({usdEquivalent})
                </Text>
              </View>
            </View>
          );
        })
      )}
    </Card>
  );
}
