import type { ExpenseCategory } from '@packages/models/expenses';
import type { ExpenseCategoryRepository } from '@services/expenses/domain/repositories/expense-category.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';
import { trace } from '@services/shared/infrastructure/decorators/trace';

export class PostgresExpenseCategoryRepository implements ExpenseCategoryRepository {
  constructor(private readonly dbService: DatabaseService) {}

  @trace('ExpenseCategory:findAll')
  async findAll(): Promise<ExpenseCategory[]> {
    return this.dbService.queryReadOnly<ExpenseCategory>(
      'SELECT id, name, description FROM financial_management.expenses_categories ORDER BY name ASC',
    );
  }
}
