import type { Expense } from '@packages/models/expenses';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';
import { ModuleNotFoundError } from '@packages/models/shared/utils/errors';

export class GetExpenseByIdUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  async execute(id: string, uid: string): Promise<Expense> {
    const expense = await this.repository.findByIdAndUserUid(id, uid);
    if (!expense) throw new ModuleNotFoundError();
    return expense;
  }
}
