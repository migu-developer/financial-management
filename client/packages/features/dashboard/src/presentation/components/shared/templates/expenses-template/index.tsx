import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type {
  Expense,
  CreateExpenseInput,
  ExpenseFilters,
} from '@packages/models/expenses';
import {
  Button,
  ConfirmDialog,
  FilterBar,
  FilterChip,
} from '@features/ui/components';
import { useTranslation } from '@packages/i18n';
import { useExpenses } from '@features/dashboard/presentation/providers/expense-provider';
import { ExpenseList } from '@features/dashboard/presentation/components/web/organisms/expense-list';
import { ExpenseModal } from '@features/dashboard/presentation/components/web/organisms/expense-modal';
import { ExpenseSummary } from '@features/dashboard/presentation/components/shared/molecules/expense-summary';

export function ExpensesTemplate() {
  const { t } = useTranslation('dashboard');
  const {
    expenses,
    totalCount,
    hasMore,
    initialLoading,
    filtering,
    loadingMore,
    error,
    filters,
    currencies,
    expenseTypes,
    expenseCategories,
    catalogsLoaded,
    clearError,
    setFilters,
    loadMore,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useExpenses();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSearchChange = useCallback(
    (name: string) => {
      const next: ExpenseFilters = { ...filters };
      if (name) {
        next.name = name;
      } else {
        delete next.name;
      }
      setFilters(next);
    },
    [filters, setFilters],
  );

  const handleTypeToggle = useCallback(
    (typeId: string) => {
      const next: ExpenseFilters = { ...filters };
      if (filters.expense_type_id === typeId) {
        delete next.expense_type_id;
      } else {
        next.expense_type_id = typeId;
      }
      setFilters(next);
    },
    [filters, setFilters],
  );

  const handleCreate = useCallback(() => {
    setEditingExpense(null);
    setModalVisible(true);
  }, []);

  const handleEdit = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setModalVisible(true);
  }, []);

  const handleSubmit = useCallback(
    async (input: Omit<CreateExpenseInput, 'user_id'>) => {
      if (editingExpense) {
        await updateExpense(editingExpense.id, input);
      } else {
        await createExpense(input);
      }
    },
    [editingExpense, createExpense, updateExpense],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingExpense) return;
    setDeleteLoading(true);
    try {
      await deleteExpense(deletingExpense.id);
      setDeletingExpense(null);
    } finally {
      setDeleteLoading(false);
    }
  }, [deletingExpense, deleteExpense]);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900 px-4 py-6 sm:px-6 lg:px-8">
      {error && (
        <View className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 mb-4 flex-row items-center justify-between">
          <Text className="text-red-700 dark:text-red-300 text-sm flex-1">
            {error}
          </Text>
          <TouchableOpacity onPress={clearError} accessibilityRole="button">
            <Text className="text-red-500 font-medium text-sm ml-2">
              &times;
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!initialLoading && (
        <View className="flex-row items-center justify-between mb-4">
          <ExpenseSummary totalCount={totalCount} loading={initialLoading} />
          <Button
            label={t('expenses.newExpense')}
            variant="primary"
            size="sm"
            onPress={handleCreate}
          />
        </View>
      )}

      {!initialLoading && catalogsLoaded && (
        <FilterBar
          searchProps={{
            placeholder: t('expenses.filters.searchPlaceholder'),
            value: filters.name ?? '',
            onChangeText: handleSearchChange,
            disabled: filtering,
          }}
        >
          {expenseTypes.map((et) => (
            <FilterChip
              key={et.id}
              label={et.name}
              selected={filters.expense_type_id === et.id}
              disabled={filtering}
              onPress={() => handleTypeToggle(et.id)}
            />
          ))}
        </FilterBar>
      )}

      <ExpenseList
        expenses={expenses}
        expenseTypes={expenseTypes}
        expenseCategories={expenseCategories}
        currencies={currencies}
        loading={initialLoading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onPress={handleEdit}
        onDelete={(expense) => setDeletingExpense(expense)}
        emptyTitle={t('expenses.emptyTitle')}
        emptyDescription={t('expenses.emptyDescription')}
      />

      {catalogsLoaded && (
        <ExpenseModal
          visible={modalVisible}
          expense={editingExpense}
          currencies={currencies}
          expenseTypes={expenseTypes}
          expenseCategories={expenseCategories}
          onClose={() => setModalVisible(false)}
          onSubmit={handleSubmit}
          title={
            editingExpense
              ? t('expenses.editExpense')
              : t('expenses.createExpense')
          }
          submitLabel={
            editingExpense ? t('expenses.update') : t('expenses.create')
          }
          cancelLabel={t('expenses.cancel')}
        />
      )}

      <ConfirmDialog
        visible={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={handleDeleteConfirm}
        title={t('expenses.deleteExpense')}
        message={t('expenses.deleteConfirmMessage', {
          name: deletingExpense?.name ?? '',
        })}
        confirmLabel={t('expenses.delete')}
        cancelLabel={t('expenses.cancel')}
        loading={deleteLoading}
      />
    </View>
  );
}
