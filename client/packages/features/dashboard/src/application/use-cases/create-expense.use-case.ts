import type { Expense, CreateExpenseInput } from '@packages/models/expenses';
import type { ExpenseRepositoryPort } from '@features/dashboard/domain/repositories/expense-repository.port';

export class CreateExpenseUseCase {
  constructor(private readonly repository: ExpenseRepositoryPort) {}

  async execute(input: Omit<CreateExpenseInput, 'user_id'>): Promise<Expense> {
    return this.repository.createExpense(input);
  }
}
