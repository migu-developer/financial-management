import type { ExpenseRepositoryPort } from '@features/dashboard/domain/repositories/expense-repository.port';

export class DeleteExpenseUseCase {
  constructor(private readonly repository: ExpenseRepositoryPort) {}

  async execute(id: string): Promise<void> {
    return this.repository.deleteExpense(id);
  }
}
