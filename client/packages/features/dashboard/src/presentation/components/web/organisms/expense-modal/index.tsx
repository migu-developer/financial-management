import React, { useState } from 'react';
import type {
  Expense,
  CreateExpenseInput,
  Currency,
  ExpenseType,
  ExpenseCategory,
} from '@packages/models/expenses';
import { Modal } from '@features/ui/components';
import { ExpenseForm } from '@features/dashboard/presentation/components/shared/molecules/expense-form';

interface ExpenseModalProps {
  visible: boolean;
  expense?: Expense | null;
  currencies: Currency[];
  expenseTypes: ExpenseType[];
  expenseCategories: ExpenseCategory[];
  onClose: () => void;
  onSubmit: (input: Omit<CreateExpenseInput, 'user_id'>) => Promise<void>;
  title: string;
  submitLabel: string;
  cancelLabel: string;
}

export function ExpenseModal({
  visible,
  expense,
  currencies,
  expenseTypes,
  expenseCategories,
  onClose,
  onSubmit,
  title,
  submitLabel,
  cancelLabel,
}: ExpenseModalProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (input: Omit<CreateExpenseInput, 'user_id'>) => {
    setLoading(true);
    try {
      await onSubmit(input);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title={title} loading={loading}>
      <ExpenseForm
        expense={expense}
        currencies={currencies}
        expenseTypes={expenseTypes}
        expenseCategories={expenseCategories}
        onSubmit={handleSubmit}
        onCancel={onClose}
        loading={loading}
        submitLabel={submitLabel}
        cancelLabel={cancelLabel}
      />
    </Modal>
  );
}
