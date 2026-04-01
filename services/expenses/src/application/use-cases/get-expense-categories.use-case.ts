import type { ExpenseCategory } from '@packages/models/expenses';
import type { ExpenseCategoryRepository } from '@services/expenses/domain/repositories/expense-category.repository';

export class GetExpenseCategoriesUseCase {
  constructor(private readonly repository: ExpenseCategoryRepository) {}

  async execute(): Promise<ExpenseCategory[]> {
    return this.repository.findAll();
  }
}
