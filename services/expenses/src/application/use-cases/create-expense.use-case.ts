import type { Expense, CreateExpenseInput } from '@packages/models/expenses';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';

export class CreateExpenseUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  async execute(
    input: Omit<CreateExpenseInput, 'user_id'>,
    uid: string,
    createdBy: string,
  ): Promise<Expense> {
    return this.repository.create(input, uid, createdBy);
  }
}
