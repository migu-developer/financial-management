import type { ExpenseType } from '@packages/models/expenses';
import type { ExpenseTypeRepository } from '@services/expenses/domain/repositories/expense-type.repository';

export class GetExpenseTypesUseCase {
  constructor(private readonly repository: ExpenseTypeRepository) {}

  async execute(): Promise<ExpenseType[]> {
    return this.repository.findAll();
  }
}
