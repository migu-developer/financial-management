export interface Expense {
  id: string;
  user_id: string;
  name: string;
  value: number;
  currency_id: string;
  expense_type_id: string;
  expense_category_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  modified_by: string | null;
}

export interface CreateExpenseInput {
  user_id: string;
  name: string;
  value: number;
  currency_id: string;
  expense_type_id: string;
  expense_category_id?: string;
}

export type UpdateExpenseInput = CreateExpenseInput;

export interface PatchExpenseInput {
  name?: string;
  value?: number;
  currency_id?: string;
  expense_type_id?: string;
  expense_category_id?: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  country: string;
}

export interface ExpenseType {
  id: string;
  name: 'income' | 'outcome';
  description: string | null;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
}
