import type { ExpenseCategoryEntity } from '@services/expenses/domain/entities/expense-category.entity';

export interface ExpenseCategoryRepository {
  findAll(): Promise<ExpenseCategoryEntity[]>;
}
