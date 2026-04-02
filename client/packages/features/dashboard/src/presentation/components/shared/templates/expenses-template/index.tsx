import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { Expense, CreateExpenseInput } from '@packages/models/expenses';
import { Button, ConfirmDialog } from '@features/ui/components';
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
    loadingMore,
    error,
    currencies,
    expenseTypes,
    expenseCategories,
    catalogsLoaded,
    clearError,
    loadMore,
    createExpense,
    updateExpense,
    deleteExpense,
    loadCatalogs,
  } = useExpenses();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

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
