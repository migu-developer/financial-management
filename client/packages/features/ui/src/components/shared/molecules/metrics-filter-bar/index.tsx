import React from 'react';
import { View } from 'react-native';
import type {
  MetricsFilters,
  Currency,
  ExpenseType,
  ExpenseCategory,
} from '@packages/models/expenses';
import { useTranslation } from '@packages/i18n';
import { FilterChip } from '@features/ui/components/shared/atoms/filter-chip';

export interface MetricsFilterBarProps {
  filters: MetricsFilters;
  currencies: Currency[];
  expenseTypes: ExpenseType[];
  categories: ExpenseCategory[];
  onChange: (filters: MetricsFilters) => void;
}

export function MetricsFilterBar({
  filters,
  currencies,
  expenseTypes,
  categories,
  onChange,
}: MetricsFilterBarProps) {
  const { t } = useTranslation('dashboard');

  const selectedCurrency = currencies.find((c) => c.id === filters.currency_id);
  const selectedType = expenseTypes.find(
    (et) => et.id === filters.expense_type_id,
  );
  const selectedCategory = categories.find(
    (c) => c.id === filters.expense_category_id,
  );

  const handleCurrencyToggle = () => {
    if (filters.currency_id) {
      onChange({ from: filters.from, to: filters.to });
    }
  };

  const handleTypeToggle = () => {
    if (filters.expense_type_id) {
      onChange({
        from: filters.from,
        to: filters.to,
        currency_id: filters.currency_id,
      });
    }
  };

  const handleCategoryToggle = () => {
    if (filters.expense_category_id) {
      onChange({
        from: filters.from,
        to: filters.to,
        currency_id: filters.currency_id,
        expense_type_id: filters.expense_type_id,
      });
    }
  };

  return (
    <View className="flex-row flex-wrap gap-2 mb-4">
      <FilterChip
        label={selectedCurrency?.code ?? t('metrics.allCurrencies')}
        selected={!!filters.currency_id}
        onPress={handleCurrencyToggle}
      />
      <FilterChip
        label={selectedType?.name ?? t('metrics.allTypes')}
        selected={!!filters.expense_type_id}
        onPress={handleTypeToggle}
      />
      <FilterChip
        label={selectedCategory?.name ?? t('metrics.allCategories')}
        selected={!!filters.expense_category_id}
        onPress={handleCategoryToggle}
      />
    </View>
  );
}
