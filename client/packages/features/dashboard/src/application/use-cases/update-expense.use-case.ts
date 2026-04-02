import type { Expense, CreateExpenseInput } from '@packages/models/expenses';
import type { ExpenseRepositoryPort } from '@features/dashboard/domain/repositories/expense-repository.port';

export class UpdateExpenseUseCase {
  constructor(private readonly repository: ExpenseRepositoryPort) {}

  async execute(
    id: string,
    input: Omit<CreateExpenseInput, 'user_id'>,
  ): Promise<Expense> {
    return this.repository.updateExpense(id, input);
  }
}
