import type { ExpenseType } from '@packages/models/expenses';
import type { ExpenseTypeRepository } from '@services/expenses/domain/repositories/expense-type.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';

export class PostgresExpenseTypeRepository implements ExpenseTypeRepository {
  constructor(private readonly dbService: DatabaseService) {}

  async findAll(): Promise<ExpenseType[]> {
    return this.dbService.queryReadOnly<ExpenseType>(
      'SELECT id, name, description FROM financial_management.expenses_types ORDER BY name ASC',
    );
  }
}
