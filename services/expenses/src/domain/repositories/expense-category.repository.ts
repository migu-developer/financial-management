import type { ExpenseCategory } from '@packages/models/expenses';

export interface ExpenseCategoryRepository {
  findAll(): Promise<ExpenseCategory[]>;
}
