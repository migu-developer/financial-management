import type { Expense, CreateExpenseInput } from '@packages/models/expenses';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';

export class UpdateExpenseUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  async execute(
    id: string,
    input: Omit<CreateExpenseInput, 'user_id'>,
    uid: string,
    modifiedBy: string,
  ): Promise<Expense> {
    return this.repository.update(id, input, uid, modifiedBy);
  }
}
