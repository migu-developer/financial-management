import type { Expense } from '@packages/models/expenses';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';

export class GetExpensesByUserUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  async execute(uid: string): Promise<Expense[]> {
    return this.repository.findAllByUserUid(uid);
  }
}
