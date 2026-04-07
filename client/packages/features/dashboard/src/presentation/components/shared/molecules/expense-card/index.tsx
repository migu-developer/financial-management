import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type {
  Expense,
  ExpenseType,
  ExpenseCategory,
  Currency,
} from '@packages/models/expenses';
import { Badge, CurrencyDisplay, Icon } from '@features/ui/components';
import { useTranslation } from '@packages/i18n';
import { textTokens } from '@features/ui/utils/colors';
import { fontSizeScale } from '@features/ui/utils/spacing';
import { useThemeActions } from '@features/ui/contexts/theme-context';
import { ColorScheme } from '@features/ui/utils/constants';
import { formatDate, getUserLocale } from '@packages/utils';

interface ExpenseCardProps {
  expense: Expense;
  expenseType?: ExpenseType;
  expenseCategory?: ExpenseCategory;
  currency?: Currency;
  onPress: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseCard({
  expense,
  expenseType,
  expenseCategory,
  currency,
  onPress,
  onDelete,
}: ExpenseCardProps) {
  const { t } = useTranslation('dashboard');
  const { colorScheme } = useThemeActions();
  const isDark = colorScheme === ColorScheme.DARK;
  const type = expenseType?.name ?? 'outcome';

  return (
    <Pressable
      className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 border border-slate-100 dark:border-slate-700"
      onPress={() => onPress(expense)}
      accessibilityRole="link"
      accessibilityLabel={t('expenses.card.accessibilityLabel', {
        name: expense.name,
        amount: `${currency?.code ?? ''} ${expense.value}`,
      })}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text
            className="text-base font-medium text-slate-900 dark:text-white"
            numberOfLines={1}
          >
            {expense.name}
          </Text>
          <View className="flex-row items-center gap-2 mt-1 flex-wrap">
            <Badge label={type} variant={type as 'income' | 'outcome'} />
            {expenseCategory && (
              <Badge label={expenseCategory.name} variant="default" />
            )}
            <Text className="text-xs text-slate-400 dark:text-slate-500">
              {formatDate(expense.created_at, getUserLocale(), 'medium')}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <View className="flex-row items-center gap-2">
            <CurrencyDisplay
              value={expense.value}
              currencyCode={currency?.code}
              type={type as 'income' | 'outcome'}
              className="text-base"
            />
            <Pressable
              className="p-1"
              onPress={(e) => {
                e.stopPropagation();
                onDelete(expense);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('expenses.card.deleteAccessibility')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name="close"
                size={fontSizeScale.lg}
                color={isDark ? textTokens.dark.muted : textTokens.light.muted}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
