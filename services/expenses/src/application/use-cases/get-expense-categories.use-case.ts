import type { ExpenseCategoryEntity } from '@services/expenses/domain/entities/expense-category.entity';
import type { ExpenseCategoryRepository } from '@services/expenses/domain/repositories/expense-category.repository';

export class GetExpenseCategoriesUseCase {
  constructor(private readonly repository: ExpenseCategoryRepository) {}

  async execute(): Promise<ExpenseCategoryEntity[]> {
    return this.repository.findAll();
  }
}
