import { Tracer } from '@aws-lambda-powertools/tracer';
import type { ExpenseCategory } from '@packages/models/expenses';
import type { ExpenseCategoryRepository } from '@services/expenses/domain/repositories/expense-category.repository';
import type { DatabaseService } from '@services/shared/domain/services/database';

const tracer = new Tracer({ serviceName: 'expenses-repository' });

export class PostgresExpenseCategoryRepository implements ExpenseCategoryRepository {
  constructor(private readonly dbService: DatabaseService) {}

  @tracer.captureMethod({ subSegmentName: 'ExpenseCategory:findAll' })
  async findAll(): Promise<ExpenseCategory[]> {
    return this.dbService.queryReadOnly<ExpenseCategory>(
      'SELECT id, name, description FROM financial_management.expenses_categories ORDER BY name ASC',
    );
  }
}
