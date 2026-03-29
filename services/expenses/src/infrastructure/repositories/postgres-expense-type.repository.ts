import type { ExpenseTypeEntity } from '@services/expenses/domain/entities/expense-type.entity';
import type { ExpenseTypeRepository } from '@services/expenses/domain/repositories/expense-type.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';

export class PostgresExpenseTypeRepository implements ExpenseTypeRepository {
  constructor(private readonly dbService: DatabaseService) {}

  async findAll(): Promise<ExpenseTypeEntity[]> {
    return this.dbService.queryReadOnly<ExpenseTypeEntity>(
      'SELECT id, name, description FROM financial_management.expenses_types ORDER BY name ASC',
    );
  }
}
