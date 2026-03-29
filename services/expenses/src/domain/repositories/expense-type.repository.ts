import type { ExpenseType } from '@packages/models/expenses';

export interface ExpenseTypeRepository {
  findAll(): Promise<ExpenseType[]>;
}
