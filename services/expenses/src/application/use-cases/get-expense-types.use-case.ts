import type { ExpenseTypeEntity } from '@services/expenses/domain/entities/expense-type.entity';
import type { ExpenseTypeRepository } from '@services/expenses/domain/repositories/expense-type.repository';

export class GetExpenseTypesUseCase {
  constructor(private readonly repository: ExpenseTypeRepository) {}

  async execute(): Promise<ExpenseTypeEntity[]> {
    return this.repository.findAll();
  }
}
