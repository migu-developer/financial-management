import React from 'react';
import { FlatList, View } from 'react-native';
import type {
  Expense,
  ExpenseType,
  ExpenseCategory,
  Currency,
} from '@packages/models/expenses';
import { LoadingSpinner, EmptyState } from '@features/ui/components';
import { ExpenseCard } from '@features/dashboard/presentation/components/shared/molecules/expense-card';
import { ExpenseCardSkeleton } from '@features/dashboard/presentation/components/shared/molecules/expense-card-skeleton';
import { FilterBarSkeleton } from '@features/dashboard/presentation/components/shared/molecules/filter-bar-skeleton';

const SKELETON_COUNT = 5;

interface ExpenseListProps {
  expenses: Expense[];
  expenseTypes: ExpenseType[];
  expenseCategories: ExpenseCategory[];
  currencies: Currency[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onPress: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  emptyTitle: string;
  emptyDescription: string;
}

export function ExpenseList({
  expenses,
  expenseTypes,
  expenseCategories,
  currencies,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  onPress,
  onDelete,
  emptyTitle,
  emptyDescription,
}: ExpenseListProps) {
  if (loading && expenses.length === 0) {
    return (
      <View className="flex-1" style={{ paddingBottom: 24 }}>
        <FilterBarSkeleton />
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <ExpenseCardSkeleton key={i} />
        ))}
      </View>
    );
  }

  if (!loading && expenses.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const getType = (typeId: string) =>
    expenseTypes.find((et) => et.id === typeId);
  const getCategory = (catId: string | null) =>
    catId ? expenseCategories.find((c) => c.id === catId) : undefined;
  const getCurrency = (currId: string) =>
    currencies.find((c) => c.id === currId);

  return (
    <FlatList
      data={expenses}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ExpenseCard
          expense={item}
          expenseType={getType(item.expense_type_id)}
          expenseCategory={getCategory(item.expense_category_id)}
          currency={getCurrency(item.currency_id)}
          onPress={onPress}
          onDelete={onDelete}
        />
      )}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loadingMore ? <LoadingSpinner size="small" /> : null}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}
