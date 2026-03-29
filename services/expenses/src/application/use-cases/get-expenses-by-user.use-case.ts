import type { ExpenseEntity } from '@services/expenses/domain/entities/expense.entity';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';

export class GetExpensesByUserUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  async execute(uid: string): Promise<ExpenseEntity[]> {
    return this.repository.findAllByUserUid(uid);
  }
}
