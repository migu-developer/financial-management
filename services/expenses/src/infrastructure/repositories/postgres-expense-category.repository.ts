import type { ExpenseCategoryEntity } from '@services/expenses/domain/entities/expense-category.entity';
import type { ExpenseCategoryRepository } from '@services/expenses/domain/repositories/expense-category.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';

export class PostgresExpenseCategoryRepository implements ExpenseCategoryRepository {
  constructor(private readonly dbService: DatabaseService) {}

  async findAll(): Promise<ExpenseCategoryEntity[]> {
    return this.dbService.queryReadOnly<ExpenseCategoryEntity>(
      'SELECT id, name, description FROM financial_management.expenses_categories ORDER BY name ASC',
    );
  }
}
