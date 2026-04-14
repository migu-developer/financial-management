import type {
  Expense,
  CreateExpenseInput,
  PatchExpenseInput,
  ExpenseFilters,
  Currency,
  ExpenseType,
  ExpenseCategory,
} from '@packages/models/expenses';
import type { PaginatedResult } from '@packages/models/shared/pagination';

export interface ExpenseRepositoryPort {
  listExpenses(
    limit?: number,
    cursor?: string,
    signal?: AbortSignal,
    filters?: ExpenseFilters,
  ): Promise<PaginatedResult<Expense>>;

  createExpense(input: Omit<CreateExpenseInput, 'user_id'>): Promise<Expense>;

  updateExpense(
    id: string,
    input: Omit<CreateExpenseInput, 'user_id'>,
  ): Promise<Expense>;

  patchExpense(id: string, input: PatchExpenseInput): Promise<Expense>;

  deleteExpense(id: string): Promise<void>;

  listCurrencies(): Promise<Currency[]>;

  listExpenseTypes(): Promise<ExpenseType[]>;

  listExpenseCategories(): Promise<ExpenseCategory[]>;
}
