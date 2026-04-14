import { Tracer } from '@aws-lambda-powertools/tracer';
import type { ExpenseType } from '@packages/models/expenses';
import type { ExpenseTypeRepository } from '@services/expenses/domain/repositories/expense-type.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';

const tracer = new Tracer({ serviceName: 'expenses-repository' });

export class PostgresExpenseTypeRepository implements ExpenseTypeRepository {
  constructor(private readonly dbService: DatabaseService) {}

  @tracer.captureMethod({ subSegmentName: 'ExpenseType:findAll' })
  async findAll(): Promise<ExpenseType[]> {
    return this.dbService.queryReadOnly<ExpenseType>(
      'SELECT id, name, description FROM financial_management.expenses_types ORDER BY name ASC',
    );
  }
}
