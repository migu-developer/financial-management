import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';

export class DeleteExpenseUseCase {
  constructor(private readonly repository: ExpenseRepository) {}

  async execute(id: string, uid: string): Promise<void> {
    return this.repository.deleteByIdAndUserUid(id, uid);
  }
}
